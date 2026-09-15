import { createStaff, deactivateStaff, deleteStaff, listStaff } from '../services/staffService.js'

export async function getStaff(request, response, next) { try { response.status(200).json({ staff: await listStaff(request.user) }) } catch (error) { next(error) } }
export async function createStaffHandler(request, response, next) { try { response.status(201).json({ staff: await createStaff(request.user, request.body) }) } catch (error) { next(error) } }
export async function deactivateStaffHandler(request, response, next) { try { response.status(200).json({ staff: await deactivateStaff(request.user, request.params.staffId) }) } catch (error) { next(error) } }
export async function deleteStaffHandler(request, response, next) { try { response.status(200).json(await deleteStaff(request.user, request.params.staffId)) } catch (error) { next(error) } }
