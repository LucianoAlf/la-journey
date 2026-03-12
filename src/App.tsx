import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Modals } from './components/Modals';
import { Dashboard } from './pages/Dashboard';
import { Jornadas } from './pages/Jornadas';
import { Gerador } from './pages/Gerador';
import { Editor } from './pages/Editor';
import { Conteudo } from './pages/Conteudo';
import { Biblioteca } from './pages/Biblioteca';
import { Alunos } from './pages/Alunos';
import { Repertorio } from './pages/Repertorio';
import { Turmas } from './pages/Turmas';
import { Professor } from './pages/Professor';
import { Gamificacao } from './pages/Gamificacao';
import { Whatsapp } from './pages/Whatsapp';
import { Relatorios } from './pages/Relatorios';
import { Integracoes } from './pages/Integracoes';
import { Configuracoes } from './pages/Configuracoes';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'jornadas': return <Jornadas />;
      case 'gerador': return <Gerador />;
      case 'editor': return <Editor />;
      case 'conteudo': return <Conteudo />;
      case 'biblioteca': return <Biblioteca />;
      case 'alunos': return <Alunos />;
      case 'repertorio': return <Repertorio />;
      case 'turmas': return <Turmas />;
      case 'professor': return <Professor />;
      case 'gamificacao': return <Gamificacao />;
      case 'whatsapp': return <Whatsapp />;
      case 'relatorios': return <Relatorios />;
      case 'integracoes': return <Integracoes />;
      case 'configuracoes': return <Configuracoes />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-300">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-[64px]' : 'ml-[240px]'}`}>
        <div className="h-screen overflow-y-auto p-7">
          {renderPage()}
        </div>
      </main>
      <Modals />
    </div>
  );
}
