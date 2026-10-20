#!/usr/bin/env python3
"""플랫폼 전용 배포: 공개 빌드 설정 조회 또는 digest 이미지 교체·실패 시 복구."""
import fcntl
import getpass
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shlex
import shutil
import subprocess
import sys
import time
from urllib.error import HTTPError
from urllib.request import urlopen

OPS = Path('/home/ubuntu/pingdom-ops/admin')
CONTAINER = 'pingdom-admin-web-1'
PROJECT = ['docker', 'compose', '-p', 'pingdom-admin']


def run(*args, env=None):
    return subprocess.check_output(args, text=True, env=env).strip()


def read_settings(path):
    settings = {}
    for line in path.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            settings[key.strip()] = value.strip().strip("\"'")
    return settings


def validate_settings(settings):
    # 이 배포는 확인된 플랫폼 인스턴스의 기존 경로와 인증 게이트웨이를 유지합니다.
    required = {
        'VITE_APP_BASE_PATH': '/console/',
        'PINGDOM_WEB_BIND_ADDRESS': '172.31.46.247',
        'PINGDOM_WEB_PORT': '8082',
        'PINGDOM_API_UPSTREAM': '172.31.36.40:8081',
    }
    for key, expected in required.items():
        if settings.get(key) != expected:
            raise ValueError(f'{key} must match the verified platform configuration')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', settings.get('VITE_NAVER_MAP_CLIENT_ID', '')):
        raise ValueError('The existing public NAVER Maps Client ID is missing or invalid')


def preflight():
    if getpass.getuser() != 'ubuntu' or '172.31.46.247' not in run('hostname', '-I').split():
        raise ValueError('SSH secrets do not target the verified platform instance')
    settings = read_settings(OPS / '.env.ec2.local')
    validate_settings(settings)
    current = json.loads(run('docker', 'inspect', CONTAINER))[0]
    labels = current['Config']['Labels']
    if labels.get('com.docker.compose.project') != 'pingdom-admin':
        raise ValueError('The existing administrator web project was not found')
    architecture = {'x86_64': 'linux/amd64', 'aarch64': 'linux/arm64'}.get(platform.machine())
    if not architecture:
        raise ValueError('Unsupported EC2 image architecture')
    return settings, current, architecture


def nginx_template(source):
    marker = '    location = /healthz {'
    if source.count(marker) != 1 or re.search(r'location[^\n]* /consulting/', source):
        raise ValueError('Review the changed Nginx template before deploying')
    # 외부 프록시의 기존 8082 → 8083 컨설팅 전달 계약을 보존합니다.
    consulting = '''    location ^~ /consulting/ {
        proxy_pass http://172.31.46.247:8083/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
    }

'''
    return source.replace(marker, consulting + marker, 1)


def validate_image(image, sha):
    if not re.fullmatch(r'[a-f0-9]{40}', sha):
        raise ValueError('Expected a full release commit SHA')
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]*/pingdom-admin@sha256:[a-f0-9]{64}', image):
        raise ValueError('Expected a Docker Hub administrator image pinned by digest')


def snapshot(current, destination):
    labels = current['Config']['Labels']
    command = PROJECT + ['--project-directory', labels['com.docker.compose.project.working_dir']]
    for path in labels.get('com.docker.compose.project.environment_file', '').split(','):
        if path:
            command += ['--env-file', path]
    for path in labels['com.docker.compose.project.config_files'].split(','):
        command += ['-f', path]
    env = dict(os.environ, PINGDOM_WEB_IMAGE=current['Config']['Image'])
    for mount in current['Mounts']:
        if mount['Destination'] == '/etc/nginx/templates/default.conf.template':
            env['PINGDOM_RUNTIME_TEMPLATE'] = mount['Source']
    config = json.loads(run(*command, 'config', '--format', 'json', env=env))
    if set(config['services']) != {'web'}:
        raise ValueError('Refusing to snapshot a Compose project containing other services')
    service = config['services']['web']
    service['image'] = current['Image']
    service.pop('build', None)
    # 마운트 파일까지 복사하므로 다음 배포의 설정 파일 변경과 독립적으로 복구됩니다.
    for index, volume in enumerate(service.get('volumes', [])):
        if volume['type'] == 'bind':
            source = Path(volume['source'])
            if not source.is_file():
                raise ValueError('Review unexpected directory mounts before deploying')
            target = destination / f'mount-{index}'
            shutil.copy2(source, target)
            volume['source'] = str(target)
    (destination / 'compose.json').write_text(json.dumps(config, indent=2))
    subprocess.run(['docker', 'image', 'save', '-o', str(destination / 'image.tar'), current['Image']], check=True)
    rollback = destination / 'rollback.sh'
    rollback.write_text('#!/usr/bin/env bash\nset -euo pipefail\n'
                        f'docker image load -i {shlex.quote(str(destination / "image.tar"))}\n'
                        + shlex.join(PROJECT + ['-f', str(destination / 'compose.json'), 'up', '-d',
                                              '--no-build', '--pull', 'never', '--force-recreate',
                                              '--wait', '--wait-timeout', '120', 'web']) + '\n')
    rollback.chmod(0o700)
    return rollback


def get_response(url):
    try:
        with urlopen(url, timeout=15) as response:
            if response.geturl() != url:
                raise ValueError('Unexpected redirect: ' + url)
            return response.status, response.headers.get('Content-Type', ''), response.read().decode()
    except HTTPError as error:
        return error.code, error.headers.get('Content-Type', ''), ''


def smoke_check():
    status, _, body = get_response('http://172.31.46.247:8082/healthz')
    if status != 200 or body.strip() != 'ok':
        raise ValueError('Web health check failed')
    origin = 'https://www.typenull.xyz'
    status, content_type, html = get_response(origin + '/console/login')
    asset = re.search(r'src="(/console/assets/[^"<>]+\.js)"', html)
    if status != 200 or 'text/html' not in content_type or not asset:
        raise ValueError('Public /console/ page or asset base is invalid')
    status, content_type, _ = get_response(origin + asset.group(1))
    if status != 200 or 'javascript' not in content_type:
        raise ValueError('Public JavaScript asset is unavailable')
    status, content_type, _ = get_response(origin + '/consulting/')
    if status != 200 or 'text/html' not in content_type:
        raise ValueError('Existing consulting route failed')
    status, content_type, _ = get_response(origin + '/api/users/me')
    if status != 401 or 'application/json' not in content_type:
        raise ValueError('Unauthenticated API requests must retain the gateway JSON 401')


def deploy(image, sha):
    validate_image(image, sha)
    settings, current, _ = preflight()
    with (OPS / '.deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        # 호출자가 전달한 검증 커밋의 번들만 사용합니다. EC2 소스 checkout은 변경하지 않습니다.
        bundle = Path(__file__).resolve().parent.parent
        if bundle.name != sha:
            raise ValueError('Deployment bundle directory must match the verified commit')
        subprocess.run(['docker', 'pull', image], check=True)
        labels = json.loads(run('docker', 'image', 'inspect', image))[0]['Config'].get('Labels') or {}
        client_hash = hashlib.sha256(settings['VITE_NAVER_MAP_CLIENT_ID'].encode()).hexdigest()
        expected_labels = {'org.opencontainers.image.revision': sha, 'io.pingdom.app-base-path': '/console/',
                           'io.pingdom.maps-client-id-sha256': client_hash}
        if any(labels.get(key) != value for key, value in expected_labels.items()):
            raise ValueError('Image revision or public build settings do not match this deployment')
        template = bundle / 'deploy/nginx.platform.conf.template'
        template.write_text(nginx_template((bundle / 'deploy/nginx/default.conf.template').read_text()))
        env = dict(os.environ, PINGDOM_WEB_IMAGE=image, PINGDOM_RUNTIME_TEMPLATE=str(template))
        compose = PROJECT + ['--project-directory', str(bundle), '--env-file', str(OPS / '.env.ec2.local'),
                             '-f', str(bundle / 'deploy/compose.registry.yml')]
        subprocess.run(compose + ['config', '--quiet'], check=True, env=env)
        subprocess.run(['docker', 'run', '--rm', '--network', 'none', '--memory', '128m',
                        '-e', 'PINGDOM_API_UPSTREAM=' + settings['PINGDOM_API_UPSTREAM'],
                        '-e', 'NGINX_ENVSUBST_FILTER=^PINGDOM_API_UPSTREAM$',
                        '-v', str(template) + ':/etc/nginx/templates/default.conf.template:ro',
                        '--entrypoint', 'sh', image,
                        '-c', '/docker-entrypoint.d/20-envsubst-on-templates.sh && nginx -t'], check=True)
        backup = OPS / 'registry-backups' / f'{time.time_ns()}-{sha[:12]}'
        backup.mkdir(parents=True, mode=0o700)
        rollback = snapshot(current, backup)
        try:
            subprocess.run(compose + ['up', '-d', '--no-build', '--pull', 'never', '--force-recreate',
                                      '--wait', '--wait-timeout', '120', 'web'], check=True, env=env)
            smoke_check()
        except Exception:
            print('Deployment failed; restoring the previous web. Backup: ' + str(backup), file=sys.stderr)
            subprocess.run(['bash', str(rollback)], check=True)
            raise
        (OPS / 'registry-current.json').write_text(json.dumps({'image': image, 'commit': sha,
                                                              'backup': str(backup)}, indent=2))
        print('Deployment and HTTP checks passed. Backup: ' + str(backup))


def main():
    os.umask(0o077)
    if sys.argv[1:] == ['check']:
        settings, _, architecture = preflight()
        print(json.dumps({'maps_client_id': settings['VITE_NAVER_MAP_CLIENT_ID'],
                          'maps_client_id_hash': hashlib.sha256(settings['VITE_NAVER_MAP_CLIENT_ID'].encode()).hexdigest(),
                          'app_base_path': settings['VITE_APP_BASE_PATH'], 'platform': architecture}))
    elif len(sys.argv) == 4 and sys.argv[1] == 'deploy':
        deploy(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit('Usage: deploy-registry-image.py check | deploy IMAGE_DIGEST COMMIT_SHA')


if __name__ == '__main__':
    main()
