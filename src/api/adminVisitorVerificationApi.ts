import customAxios from './customAxios'
import type { VisitorVerificationCorrection, VisitorVerificationCorrectionPage, VisitorVerificationReport, VisitorVerificationReportPage, VisitorVerificationStatus } from '../types/adminVisitorVerification.types'

const PATH = '/admin/visitor-verification-reports'
export async function getAdminVisitorVerificationReports(params: { status?: VisitorVerificationStatus; page?: number; limit?: number }) { const { data } = await customAxios.get<VisitorVerificationReportPage>(PATH, { params }); return data }
export async function reviewAdminVisitorVerificationReport(reportId: number, decision: Extract<VisitorVerificationStatus, 'ACCEPTED' | 'REJECTED'>, reviewNote?: string) { const { data } = await customAxios.post<VisitorVerificationReport>(`${PATH}/${reportId}/review`, { decision, reviewNote }); return data }
export async function getAdminVisitorVerificationCorrections(params: { status?: VisitorVerificationStatus; page?: number; limit?: number }) { const { data } = await customAxios.get<VisitorVerificationCorrectionPage>(`${PATH}/corrections`, { params }); return data }
export async function reviewAdminVisitorVerificationCorrection(correctionId: number, decision: Extract<VisitorVerificationStatus, 'ACCEPTED' | 'REJECTED'>, reviewNote?: string) { const { data } = await customAxios.post<VisitorVerificationCorrection>(`${PATH}/corrections/${correctionId}/review`, { decision, reviewNote }); return data }
