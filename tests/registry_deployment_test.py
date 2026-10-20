"""Docker/운영 접속 없이 배포 거부 조건과 실패 후 복구 경계를 검사합니다."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('deployment', ROOT / 'scripts/deploy-registry-image.py')
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)
SHA = 'a' * 40
IMAGE = 'synthetic/pingdom-admin@sha256:' + 'b' * 64
SETTINGS = {'VITE_NAVER_MAP_CLIENT_ID': 'synthetic-public-id', 'VITE_APP_BASE_PATH': '/console/',
            'PINGDOM_WEB_BIND_ADDRESS': '172.31.46.247', 'PINGDOM_WEB_PORT': '8082',
            'PINGDOM_API_UPSTREAM': '172.31.36.40:8081'}


class DeploymentTests(unittest.TestCase):
    def test_target_and_public_configuration_validation(self):
        deployment.validate_settings(SETTINGS)
        for key, value in [('VITE_APP_BASE_PATH', '/operator/'), ('PINGDOM_API_UPSTREAM', '172.31.46.247:8080'),
                           ('PINGDOM_WEB_BIND_ADDRESS', '0.0.0.0'), ('VITE_NAVER_MAP_CLIENT_ID', '')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                deployment.validate_settings(dict(SETTINGS, **{key: value}))
        with patch.object(deployment.getpass, 'getuser', return_value='root'), self.assertRaises(ValueError):
            deployment.preflight()

    def test_digest_validation_precedes_any_server_mutation(self):
        deployment.validate_image(IMAGE, SHA)
        for image, sha in [(IMAGE, 'release'), ('synthetic/pingdom-admin:latest', SHA),
                           (IMAGE.replace('/pingdom-admin', '/pingdom'), SHA), (IMAGE + ';echo bad', SHA)]:
            with self.subTest(image=image), patch.object(deployment, 'preflight') as preflight:
                with self.assertRaises(ValueError):
                    deployment.deploy(image, sha)
                preflight.assert_not_called()

    def test_template_keeps_gateway_and_consulting_routes(self):
        source = (ROOT / 'deploy/nginx/default.conf.template').read_text()
        result = deployment.nginx_template(source)
        self.assertIn('proxy_pass http://${PINGDOM_API_UPSTREAM}/;', result)
        self.assertIn('proxy_pass http://172.31.46.247:8083/;', result)
        for invalid in [source.replace('    location = /healthz {', ''), result]:
            with self.assertRaises(ValueError):
                deployment.nginx_template(invalid)

    def test_snapshot_preserves_actual_image_and_copies_runtime_mounts(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            source = directory / 'live-template'
            source.write_text('original template')
            config = {'services': {'web': {'image': 'mutable:tag', 'build': {'context': '/old'},
                       'volumes': [{'type': 'bind', 'source': str(source), 'target': '/template', 'read_only': True}]}}}
            current = {'Image': 'sha256:' + 'c' * 64, 'Mounts': [], 'Config': {'Image': 'mutable:tag', 'Labels': {
                'com.docker.compose.project.working_dir': '/old', 'com.docker.compose.project.config_files': '/old/compose.yml',
                'com.docker.compose.project.environment_file': '/old/.env'}}}
            backup = directory / 'backup'
            backup.mkdir()
            with patch.object(deployment, 'run', return_value=json.dumps(config)), patch.object(deployment.subprocess, 'run'):
                rollback = deployment.snapshot(current, backup)
            saved = json.loads((backup / 'compose.json').read_text())['services']['web']
            source.write_text('changed after deployment')
            self.assertEqual(saved['image'], current['Image'])
            self.assertNotIn('build', saved)
            self.assertEqual(Path(saved['volumes'][0]['source']).read_text(), 'original template')
            self.assertIn('--pull never', rollback.read_text())
            self.assertIn('docker image load', rollback.read_text())

    def test_smoke_checks_reject_html_api_errors_and_missing_assets(self):
        healthy = [(200, 'text/plain', 'ok\n'),
                   (200, 'text/html', '<script src="/console/assets/index-synthetic.js"></script>'),
                   (200, 'application/javascript', ''), (200, 'text/html', ''),
                   (401, 'application/json', '')]
        with patch.object(deployment, 'get_response', side_effect=healthy):
            deployment.smoke_check()
        for index, broken in [(2, (404, 'text/html', '')), (4, (200, 'text/html', ''))]:
            responses = list(healthy)
            responses[index] = broken
            with patch.object(deployment, 'get_response', side_effect=responses), self.assertRaises(ValueError):
                deployment.smoke_check()

    def simulate(self, failure):
        with tempfile.TemporaryDirectory() as tmp:
            ops = Path(tmp) / 'ops'
            ops.mkdir()
            bundle = Path(tmp) / SHA
            (bundle / 'deploy/nginx').mkdir(parents=True)
            (bundle / 'deploy/nginx/default.conf.template').write_text((ROOT / 'deploy/nginx/default.conf.template').read_text())
            labels = {'org.opencontainers.image.revision': SHA, 'io.pingdom.app-base-path': '/console/',
                      'io.pingdom.maps-client-id-sha256': deployment.hashlib.sha256(SETTINGS['VITE_NAVER_MAP_CLIENT_ID'].encode()).hexdigest()}
            commands = []
            rollback = ops / 'rollback.sh'

            def command(args, **_kwargs):
                commands.append(args)
                if (failure == 'pull' and args[:2] == ['docker', 'pull']) or (failure == 'replace' and 'up' in args):
                    raise subprocess.CalledProcessError(1, args)

            with patch.object(deployment, 'OPS', ops), patch.object(deployment, '__file__', str(bundle / 'scripts/deploy-registry-image.py')), \
                    patch.object(deployment, 'preflight', return_value=(SETTINGS, {}, 'linux/amd64')), \
                    patch.object(deployment, 'run', return_value=json.dumps([{'Config': {'Labels': labels}}])), \
                    patch.object(deployment.subprocess, 'run', side_effect=command), \
                    patch.object(deployment, 'snapshot', return_value=rollback) as snapshot, \
                    patch.object(deployment, 'smoke_check', side_effect=ValueError('synthetic health failure') if failure == 'health' else None):
                if failure:
                    with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                        deployment.deploy(IMAGE, SHA)
                else:
                    deployment.deploy(IMAGE, SHA)
                if failure == 'pull':
                    snapshot.assert_not_called()
                    self.assertFalse(any('up' in args for args in commands))
                self.assertEqual(['bash', str(rollback)] in commands, failure in ('replace', 'health'))
                self.assertEqual((ops / 'registry-current.json').exists(), failure is None)

    def test_pull_failure_preserves_current_web(self):
        self.simulate('pull')

    def test_container_failure_restores_previous_web(self):
        self.simulate('replace')

    def test_public_route_failure_restores_previous_web(self):
        self.simulate('health')

    def test_success_records_deployed_digest(self):
        self.simulate(None)


if __name__ == '__main__':
    unittest.main()
