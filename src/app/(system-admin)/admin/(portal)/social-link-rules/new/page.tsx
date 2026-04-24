import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { RuleForm } from '../RuleForm'

export default async function NewSocialLinkRulePage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.slr_new}</h1>
      <RuleForm tr={tr} />
    </div>
  )
}
