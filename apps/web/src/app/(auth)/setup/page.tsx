import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupForm } from './setup-form'

export default function SetupPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-zinc-900">Alquileres</span>
        </div>
        <CardTitle className="text-xl">Configuración inicial</CardTitle>
        <CardDescription>
          Creá la organización y el primer usuario administrador.
          <br />
          <span className="text-amber-600 font-medium">Solo disponible en el primer acceso.</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetupForm />
      </CardContent>
    </Card>
  )
}
