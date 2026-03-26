import { redirect } from 'next/navigation'

// La raíz redirige al overview (el middleware protege la ruta)
export default function Home() {
  redirect('/overview')
}
