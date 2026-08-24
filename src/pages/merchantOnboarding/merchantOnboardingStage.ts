import type {
  MerchantOwnerApplicationProfile,
  MerchantVerification,
} from '../../types/merchantOnboarding.types'

export type MerchantOnboardingStage =
  | 'profile'
  | 'profile-reapply'
  | 'verification'
  | 'verification-reapply'
  | 'review'
  | 'approved'

function isVerificationApproved(verification: MerchantVerification | null) {
  return (
    verification?.identityStatus === 'APPROVED' &&
    verification.businessStatus === 'APPROVED'
  )
}

function hasRejectedVerification(verification: MerchantVerification | null) {
  return (
    verification?.identityStatus === 'REJECTED' ||
    verification?.businessStatus === 'REJECTED'
  )
}

export function getMerchantOnboardingStage(
  profile: MerchantOwnerApplicationProfile | null,
  verification: MerchantVerification | null,
): MerchantOnboardingStage {
  if (!profile) return 'profile'
  if (profile.status === 'REJECTED' || profile.status === 'REVOKED') {
    return 'profile-reapply'
  }
  if (!verification) return 'verification'
  if (hasRejectedVerification(verification)) return 'verification-reapply'
  if (profile.status === 'ACTIVE' && isVerificationApproved(verification)) {
    return 'approved'
  }

  return 'review'
}
