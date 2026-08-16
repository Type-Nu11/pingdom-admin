import customAxios from './customAxios'
import type { ScoutFieldReport, ScoutFieldReportPage, ScoutFieldReportStatus, ScoutProfile, ScoutProfilePage, ScoutProfileStatus } from '../types/adminScout.types'
const PROFILES = '/admin/scout-profiles'; const REPORTS = '/admin/scout-field-reports'
export async function getAdminScoutProfiles(params: { status?: ScoutProfileStatus; page?: number; limit?: number }) { const { data } = await customAxios.get<ScoutProfilePage>(PROFILES, { params }); return data }
export async function getAdminScoutProfile(userId: number) { const { data } = await customAxios.get<ScoutProfile>(`${PROFILES}/${userId}`); return data }
export async function reviewAdminScoutProfile(userId: number, action: 'approve' | 'suspend' | 'revoke', reason?: string) { const { data } = await customAxios.post<ScoutProfile>(`${PROFILES}/${userId}/${action}`, { reason }); return data }
export async function grantAdminScoutEligibility(userId: number, request: { eligibleFrom: string; eligibleUntil?: string; reason?: string }) { const { data } = await customAxios.post<ScoutProfile>(`${PROFILES}/${userId}/eligibility/grant`, request); return data }
export async function reviewAdminScoutEligibility(userId: number, action: 'suspend' | 'revoke', reason: string) { const { data } = await customAxios.post<ScoutProfile>(`${PROFILES}/${userId}/eligibility/${action}`, { reason }); return data }
export async function getAdminScoutFieldReports(params: { status?: ScoutFieldReportStatus; page?: number; limit?: number }) { const { data } = await customAxios.get<ScoutFieldReportPage>(REPORTS, { params }); return data }
export async function reviewAdminScoutFieldReport(reportId: number, decision: 'ACCEPTED' | 'REJECTED', reviewNote?: string) { const { data } = await customAxios.post<ScoutFieldReport>(`${REPORTS}/${reportId}/review`, { decision, reviewNote }); return data }
