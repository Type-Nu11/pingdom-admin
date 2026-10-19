import type { AdminNotificationType, AdminNotificationDeliveryStatus, AdminOutboxEventStatus, AdminNotificationDeliveryChannel } from '../types/adminNotification.types'

export const NOTIFICATION_TYPE_LABELS: Record<AdminNotificationType, string> = {
  NEW_HOTPLACE: '인기 장소 안내', NEW_LIKE: '새 좋아요',
  PLACE_INFORMATION_REVERIFICATION_REQUESTED: '장소 정보 재확인 요청',
  PLACE_INFORMATION_REVERIFICATION_REMINDER: '장소 정보 재확인 안내',
  ADMIN_REPORT_RECEIVED: '새 신고 접수', ADMIN_REPORT_PROCESSED: '신고 처리 결과',
  ADMIN_DUPLICATE_PLACE_DETECTED: '중복 장소 후보 발견', ADMIN_USER_SANCTION: '사용자 제재 안내',
}
export const DELIVERY_STATUS_LABELS: Record<AdminNotificationDeliveryStatus, string> = {
  SUCCEEDED: '발송 성공', FAILED: '발송 실패', RETRY_SCHEDULED: '재시도 예정', FINAL_FAILED: '최종 실패',
}
export const OUTBOX_STATUS_LABELS: Record<AdminOutboxEventStatus, string> = {
  PENDING: '처리 대기', PROCESSING: '처리 중', RETRY: '재시도 대기', SUCCEEDED: '처리 완료', FAILED: '처리 실패',
}
export const DELIVERY_CHANNEL_LABELS: Record<AdminNotificationDeliveryChannel, string> = { FCM: '앱 푸시', EMAIL: '이메일' }
