import { AdminPagination } from '../../components/common/AdminPagination'
import type { AdminUserSanctionHistoryItem } from '../../types/adminUserBan.types'
import { formatBanType, formatBanReason, formatSanctionAction, getSanctionActionTone, formatSanctionHistoryPeriod, formatSanctionHistorySummary } from './userBan.format'
import * as U from '../adminUtility/AdminUtilityPage.styles'
import * as S from '../place/PlaceManagePage.styles'

interface UserSanctionHistoryProps {
  sanctionHistories: AdminUserSanctionHistoryItem[]
  isSanctionHistoryLoading: boolean
  sanctionHistoryErrorMessage: string
  safeSanctionHistoryTotalPages: number
  sanctionHistoryPage: number
  sanctionHistoryHasNext: boolean
  handleSanctionHistoryPageChange: (page: number) => void
}

export function UserSanctionHistory({
  sanctionHistories,
  isSanctionHistoryLoading,
  sanctionHistoryErrorMessage,
  safeSanctionHistoryTotalPages,
  sanctionHistoryPage,
  sanctionHistoryHasNext,
  handleSanctionHistoryPageChange,
}: UserSanctionHistoryProps) {
  return isSanctionHistoryLoading ? (
    <U.DetailEmpty>
      <S.MaterialIcon aria-hidden="true">hourglass_empty</S.MaterialIcon>
      <strong>제재 이력을 불러오는 중입니다.</strong>
    </U.DetailEmpty>
  ) : sanctionHistoryErrorMessage ? (
    <U.Notice $variant="error" role="alert">
      {sanctionHistoryErrorMessage}
    </U.Notice>
  ) : sanctionHistories.length > 0 ? (
    <>
      <U.DetailList>
        {sanctionHistories.map((history) => (
          <U.DetailRow key={history.historyId}>
            <dt>
              <U.TableStatusBadge
                $tone={getSanctionActionTone(history.action)}
              >
                {formatSanctionAction(history.action)}
              </U.TableStatusBadge>
            </dt>
            <dd>
              <U.SanctionHistoryHeader>
                <strong>{formatBanType(history.banType)}</strong>
              </U.SanctionHistoryHeader>
              <U.SanctionHistoryMeta>
                {formatBanReason(history.reason)}
              </U.SanctionHistoryMeta>
              <U.SanctionHistoryMeta>
                {formatSanctionHistoryPeriod(history)} ·{' '}
                {formatSanctionHistorySummary(history)}
              </U.SanctionHistoryMeta>
            </dd>
          </U.DetailRow>
        ))}
      </U.DetailList>
      {safeSanctionHistoryTotalPages > 1 ? (
        <AdminPagination ariaLabel="사용자 제재 이력 페이지네이션" page={sanctionHistoryPage} totalPages={safeSanctionHistoryTotalPages} hasNext={sanctionHistoryHasNext} disabled={isSanctionHistoryLoading} onPageChange={handleSanctionHistoryPageChange} />
      ) : null}
    </>
  ) : (
    <U.DetailEmpty>
      <S.MaterialIcon aria-hidden="true">history</S.MaterialIcon>
      <strong>제재 이력이 없습니다.</strong>
      <span>이 사용자에게 기록된 밴 처리, 해제, 만료 이력이 없습니다.</span>
    </U.DetailEmpty>
  )
}
