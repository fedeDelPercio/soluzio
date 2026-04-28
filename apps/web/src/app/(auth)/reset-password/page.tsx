import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from './reset-password-form'

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-zinc-900">Soluzio</span>
        </div>
        <CardTitle className="text-xl">Crear nueva contraseña</CardTitle>
        <CardDescription>
          Ingresá una contraseña nueva para tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  )
}
