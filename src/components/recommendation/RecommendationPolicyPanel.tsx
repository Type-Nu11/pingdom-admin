import { useState } from 'react'
import { useAdminRecommendationPolicy } from '../../hooks/useAdminRecommendationPolicy'
import type { AdminRecommendationTrafficPolicyUpdateItem } from '../../types/adminRecommendationPolicy.types'
import * as Shell from '../../pages/place/PlaceManagePage.styles'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'
import * as S from '../../pages/placeVerification/PlaceVerificationPage.styles'

interface PolicyDraft extends Omit<AdminRecommendationTrafficPolicyUpdateItem, 'trafficPercentage'> {
  key: number
  trafficPercentage: string
  fallbackVersion: string
}

let policyKey = 2
const initialPolicies: PolicyDraft[] = [
  { key: 1, recommendationVersion: '', trafficPercentage: '100', enabled: true, fallbackVersion: '' },
]

function validateFallbackCycles(policies: PolicyDraft[]) {
  const policyMap = new Map(policies.map((policy) => [policy.recommendationVersion.trim(), policy]))
  for (const policy of policies) {
    const visited = new Set<string>()
    let current = policy.recommendationVersion.trim()
    while (current) {
      if (visited.has(current)) return false
      visited.add(current)
      const next = policyMap.get(current)
      if (!next || next.enabled) break
      current = next.fallbackVersion.trim()
    }
  }
  return true
}

export function RecommendationPolicyPanel() {
  const hook = useAdminRecommendationPolicy()
  const [policies, setPolicies] = useState<PolicyDraft[]>(initialPolicies)
  const [reason, setReason] = useState('')
  const [dialog, setDialog] = useState<'traffic' | 'resync' | null>(null)
  const [formError, setFormError] = useState('')

  const total = policies.reduce((sum, policy) => {
    const value = Number(policy.trafficPercentage)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)

  const updatePolicy = (key: number, patch: Partial<PolicyDraft>) => {
    setPolicies((current) => current.map((policy) => policy.key === key ? { ...policy, ...patch } : policy))
    setFormError('')
  }

  const validate = () => {
    if (!reason.trim()) return '정책 변경 사유를 입력해주세요.'
    if (policies.length === 0) return '추천 버전 정책을 1개 이상 입력해주세요.'
    const versions = policies.map((policy) => policy.recommendationVersion.trim())
    if (versions.some((version) => !version)) return '모든 추천 버전을 입력해주세요.'
    if (new Set(versions).size !== versions.length) return '같은 추천 버전을 중복 입력할 수 없습니다.'
    if (policies.some((policy) => !Number.isInteger(Number(policy.trafficPercentage)) || Number(policy.trafficPercentage) < 0 || Number(policy.trafficPercentage) > 100)) return '추천 요청 배분 비율은 0~100 사이 정수여야 합니다.'
    if (total !== 100) return `추천 요청 배분 비율 합계는 100이어야 합니다. 현재 ${total}%입니다.`
    if (!policies.some((policy) => policy.enabled)) return '활성 추천 버전이 1개 이상이어야 합니다.'
    for (const policy of policies.filter((item) => !item.enabled)) {
      const fallback = policy.fallbackVersion.trim()
      if (!fallback) return `${policy.recommendationVersion} 대신 사용할 추천 버전을 입력해주세요.`
      if (fallback === policy.recommendationVersion.trim() || !versions.includes(fallback)) return `${policy.recommendationVersion}의 대체 버전은 다른 입력 버전이어야 합니다.`
    }
    if (!validateFallbackCycles(policies)) return '대체 버전이 서로를 가리키고 있습니다. 연결을 다시 확인해주세요.'
    return ''
  }

  const openTrafficConfirm = () => {
    const error = validate()
    if (error) {
      setFormError(error)
      return
    }
    setDialog('traffic')
  }

  const submitTraffic = async () => {
    const result = await hook.updateTraffic({
      reason: reason.trim(),
      policies: policies.map((policy) => ({
        recommendationVersion: policy.recommendationVersion.trim(),
        trafficPercentage: Number(policy.trafficPercentage),
        enabled: policy.enabled,
        fallbackVersion: policy.enabled ? undefined : policy.fallbackVersion.trim(),
      })),
    })
    if (result) {
      setPolicies(result.policies.map((policy) => ({
        key: policyKey++,
        recommendationVersion: policy.recommendationVersion,
        trafficPercentage: String(policy.trafficPercentage),
        enabled: policy.enabled,
        fallbackVersion: policy.fallbackVersion ?? '',
      })))
      setReason('')
      setDialog(null)
    }
  }

  const submitResync = async () => {
    if (await hook.resyncSnapshots()) setDialog(null)
  }

  return (
    <>
      {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
      {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}
      <Shared.DetailNotice>
        <Shell.MaterialIcon aria-hidden="true">info</Shell.MaterialIcon>
        <div><strong>현재 적용 중인 추천 설정은 불러올 수 없습니다.</strong>설정을 변경하려면 사용 가능한 모든 추천 버전을 빠짐없이 입력해주세요. 이 화면에는 여기서 저장에 성공한 설정만 표시됩니다.</div>
      </Shared.DetailNotice>
      <Shared.Panel>
        <Shared.PanelHeader><div><Shared.PanelTitle>추천 버전별 적용 비율 설정</Shared.PanelTitle><Shared.PanelDescription>전체 정책을 한 번에 교체합니다. 합계는 정확히 100%여야 합니다.</Shared.PanelDescription></div><Shared.HeaderActions><Shared.PanelCount>합계 {total}%</Shared.PanelCount><Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setPolicies((current) => [...current, { key: policyKey++, recommendationVersion: '', trafficPercentage: '0', enabled: true, fallbackVersion: '' }])}>버전 추가</Shared.SecondaryButton></Shared.HeaderActions></Shared.PanelHeader>
        <S.FormBody>
          <S.CardList>
            {policies.map((policy) => (
              <S.PolicyRow key={policy.key}>
                <S.Field>추천 버전 *<S.Input value={policy.recommendationVersion} placeholder="place-rec-v1" disabled={hook.activeAction !== null} onChange={(event) => updatePolicy(policy.key, { recommendationVersion: event.target.value })} /></S.Field>
                <S.Field>추천 요청 배분 비율 *<S.Input inputMode="numeric" value={policy.trafficPercentage} disabled={hook.activeAction !== null} onChange={(event) => updatePolicy(policy.key, { trafficPercentage: event.target.value })} /></S.Field>
                <S.CheckField><input type="checkbox" checked={policy.enabled} disabled={hook.activeAction !== null} onChange={(event) => updatePolicy(policy.key, { enabled: event.target.checked, fallbackVersion: event.target.checked ? '' : policy.fallbackVersion })} />활성화</S.CheckField>
                <S.Field>대신 사용할 추천 버전<S.Input value={policy.fallbackVersion} placeholder={policy.enabled ? '활성 버전은 불필요' : 'place-rec-v1'} disabled={policy.enabled || hook.activeAction !== null} onChange={(event) => updatePolicy(policy.key, { fallbackVersion: event.target.value })} /></S.Field>
                <Shared.SecondaryButton type="button" disabled={policies.length === 1 || hook.activeAction !== null} onClick={() => setPolicies((current) => current.filter((item) => item.key !== policy.key))}>삭제</Shared.SecondaryButton>
              </S.PolicyRow>
            ))}
          </S.CardList>
          <S.Section><S.Field>변경 사유 *<S.TextArea value={reason} maxLength={500} disabled={hook.activeAction !== null} onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></S.Field></S.Section>
          {formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}
          <S.InlineActions><Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={openTrafficConfirm}>변경 내용 확인</Shared.PrimaryButton></S.InlineActions>
        </S.FormBody>
      </Shared.Panel>

      {hook.trafficResult ? <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>현재 적용 결과</Shared.PanelTitle><Shared.PanelDescription>기본 버전 {hook.trafficResult.defaultVersion}</Shared.PanelDescription></div></Shared.PanelHeader><S.FormBody><S.CardList>{hook.trafficResult.policies.map((policy) => <S.RecordCard key={policy.recommendationVersion}><S.RecordHeader><S.RecordTitle>{policy.recommendationVersion}</S.RecordTitle><S.StatusBadge $tone={policy.enabled ? 'success' : 'danger'}>{policy.enabled ? '활성' : '비활성'}</S.StatusBadge></S.RecordHeader><S.RecordMeta>{policy.stage} · 배분 비율 {policy.trafficPercentage}%{policy.fallbackVersion ? ` · 대체 버전 ${policy.fallbackVersion}` : ''}</S.RecordMeta></S.RecordCard>)}</S.CardList></S.FormBody></Shared.Panel> : null}

      <Shared.Panel>
        <Shared.PanelHeader><div><Shared.PanelTitle>추천 정보 다시 계산</Shared.PanelTitle><Shared.PanelDescription>모든 장소의 추천 정보를 현재 데이터 기준으로 다시 계산합니다.</Shared.PanelDescription></div><Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setDialog('resync')}>다시 계산</Shared.PrimaryButton></Shared.PanelHeader>
        {hook.resyncResult ? <S.FormBody><S.MetricGrid><S.MetricCard><span>대상 장소</span><strong>{hook.resyncResult.placeCount.toLocaleString()}</strong></S.MetricCard><S.MetricCard><span>기본 동기화 / 삭제</span><strong>{hook.resyncResult.synchronizedSnapshotCount.toLocaleString()} / {hook.resyncResult.deletedSnapshotCount.toLocaleString()}</strong></S.MetricCard><S.MetricCard><span>유사도 동기화 / 삭제</span><strong>{hook.resyncResult.synchronizedSimilaritySnapshotCount.toLocaleString()} / {hook.resyncResult.deletedSimilaritySnapshotCount.toLocaleString()}</strong></S.MetricCard><S.MetricCard><span>버전 동기화 / 삭제</span><strong>{hook.resyncResult.synchronizedVersionSnapshotCount.toLocaleString()} / {hook.resyncResult.deletedVersionSnapshotCount.toLocaleString()}</strong></S.MetricCard></S.MetricGrid></S.FormBody> : null}
      </Shared.Panel>

      {dialog ? <Shared.ModalOverlay role="presentation" onMouseDown={() => hook.activeAction === null && setDialog(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="recommendation-policy-confirm-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="recommendation-policy-confirm-title">{dialog === 'traffic' ? '적용 비율 설정 변경 확인' : '추천 정보 다시 계산 확인'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><Shared.ModalWarning>{dialog === 'traffic' ? `${policies.length}개 버전의 적용 비율 설정 전체를 합계 ${total}%로 교체합니다.` : '모든 장소의 추천 정보를 다시 계산합니다. 처리 시간이 길어질 수 있습니다.'}</Shared.ModalWarning>{hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => void (dialog === 'traffic' ? submitTraffic() : submitResync())}>{hook.activeAction ? '처리 중' : dialog === 'traffic' ? '정책 변경' : '다시 계산'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </>
  )
}
