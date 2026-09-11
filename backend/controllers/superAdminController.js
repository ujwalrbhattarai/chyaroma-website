import { createSuperAdmin, deactivateSuperAdmin, listSuperAdmins } from '../services/superAdminService.js'

export async function getSuperAdmins(request, response, next) {
  try {
    response.status(200).json({ superAdmins: await listSuperAdmins(request.user) })
  } catch (error) {
    next(error)
  }
}

export async function createSuperAdminHandler(request, response, next) {
  try {
    response.status(201).json({ superAdmin: await createSuperAdmin(request.user, request.body) })
  } catch (error) {
    next(error)
  }
}

export async function deactivateSuperAdminHandler(request, response, next) {
  try {
    response.status(200).json({ superAdmin: await deactivateSuperAdmin(request.user, request.params.id) })
  } catch (error) {
    next(error)
  }
}
