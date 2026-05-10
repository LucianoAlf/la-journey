import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Jornadas } from './pages/Jornadas'
import { Gerador } from './pages/Gerador'
import { Editor } from './pages/Editor'
import { Conteudo } from './pages/Conteudo'
import { Biblioteca } from './pages/Biblioteca'
import { Alunos } from './pages/Alunos'
import { Repertorio } from './pages/Repertorio'
import { Turmas } from './pages/Turmas'
import { Professor } from './pages/Professor'
import { Gamificacao } from './pages/Gamificacao'
import { Whatsapp } from './pages/Whatsapp'
import { Relatorios } from './pages/Relatorios'
import { Integracoes } from './pages/Integracoes'
import { Configuracoes } from './pages/Configuracoes'
import { AlphaTabFixtures } from './pages/AlphaTabFixtures'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="jornadas" element={<Jornadas />} />
          <Route path="gerador" element={<Gerador />} />
          <Route path="editor" element={<Editor />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="conteudo" element={<Conteudo />} />
          <Route path="biblioteca" element={<Biblioteca />} />
          <Route path="alunos" element={<Alunos />} />
          <Route path="repertorio" element={<Repertorio />} />
          <Route path="turmas" element={<Turmas />} />
          <Route path="professor" element={<Professor />} />
          <Route path="gamificacao" element={<Gamificacao />} />
          <Route path="whatsapp" element={<Whatsapp />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="integracoes" element={<Integracoes />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="dev/alphatab-fixtures" element={<AlphaTabFixtures />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
