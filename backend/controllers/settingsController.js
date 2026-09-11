import { getSettings, getPublicBranding, updateSettings, uploadLogo } from '../services/settingsService.js'

export async function getSettingsHandler(request, response, next) {
  try {
    const branchId = request.query.branchId ?? request.user.branchId
    response.status(200).json({ settings: await getSettings(request.user, branchId) })
  } catch (error) { next(error) }
}

export async function updateSettingsHandler(request, response, next) {
  try {
    const branchId = request.body.branchId ?? request.user.branchId
    response.status(200).json({ settings: await updateSettings(request.user, branchId, request.body) })
  } catch (error) { next(error) }
}

export async function getPublicBrandingHandler(request, response, next) {
  try {
    const branchId = request.query.branchId
    const tableToken = request.query.token
    response.status(200).json({ branding: await getPublicBranding({ branchId, tableToken }) })
  } catch (error) { next(error) }
}

export async function uploadLogoHandler(request, response, next) {
  try {
    const branchId = request.body.branchId ?? request.user.branchId
    const { dataUrl } = request.body
    response.status(200).json({ settings: await uploadLogo(request.user, branchId, dataUrl) })
  } catch (error) { next(error) }
}
