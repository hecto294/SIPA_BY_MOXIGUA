// src/modules/coordinador/components/SidebarCoordinador.jsx
import React from 'react';
import './SidebarCoordinador.css';

const ITEMS = [
  { key: 'dashboard', icon: 'fa-home', label: 'Dashboard', path: '/coordinador' },
  { key: 'parametrizacion', icon: 'fa-cog', label: 'Parametrización', path: '/coordinador/parametrizacion' },
  { key: 'fichas', icon: 'fa-layer-group', label: 'Centro de Fichas', path: '/coordinador/fichas' },
  { key: 'cartas-presentacion', icon: 'fa-envelope-open-text', label: 'Cartas de Presentación', path: '/coordinador/cartas-presentacion' },
  { key: 'reportes', icon: 'fa-chart-line', label: 'Reportes', path: '/coordinador/reportes' },
  { key: 'reporte-bitacoras', icon: 'fa-book', label: 'Bitácoras', path: '/coordinador/reporte-bitacoras' },
  { key: 'momentos', icon: 'fa-clock', label: 'Momentos', path: '/coordinador/momentos' },
  { key: 'centros-formacion', icon: 'fa-university', label: 'Centros de Formación', path: '/coordinador/centros-formacion' },
  { key: 'empresas', icon: 'fa-building', label: 'Empresas', path: '/coordinador/empresas' },
  { key: 'aprendices', icon: 'fa-users', label: 'Aprendices', path: '/coordinador/aprendices' },
  { key: 'crear-proceso', icon: 'fa-plus-circle', label: 'Crear proceso', path: '/coordinador/procesos/nuevo' },
  { key: 'instructores', icon: 'fa-user', label: 'Instructores', path: '/coordinador/instructores' },
  { key: 'instructores-ep', icon: 'fa-user-graduate', label: 'Instructores EP', path: '/coordinador/instructores-ep' },
];

const SidebarCoordinador = ({ onNavigate, activePage }) => {
  return (
    <aside className="sipa-sidebar">
      <nav className="sipa-sidebar__nav">
        {ITEMS.map(({ key, icon, label, path }) => (
          <button
            key={key}
            type="button"
            className={`sipa-sidebar__item ${activePage === key ? 'active' : ''}`}
            onClick={() => onNavigate(path)}
          >
            <i className={`fas ${icon}`}></i>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default SidebarCoordinador;