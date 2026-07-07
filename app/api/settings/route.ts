import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { getFacilitySettings, updateSettings, updateSettingsSchema } from './controller'

export async function GET() {
  try {
    return ok(await getFacilitySettings())
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const input = await parseBody(request, updateSettingsSchema)
    return ok(await updateSettings(input))
  } catch (error) {
    return fail(error)
  }
}
