// src/modules/auth/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/providers/useAuth';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const navigate = useNavigate();
  const { login } = useAuth();

  // =============== VALIDACIONES ===============
  const validateEmail = (value) => {
    if (!value.trim()) return 'El correo electrónico es obligatorio';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Ingresa un correo electrónico válido';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'La contraseña es obligatoria';
    if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return '';
  };

  const emailError = touched.email ? validateEmail(email) : '';
  const passwordError = touched.password ? validatePassword(password) : '';

  const isFormValid =
    !validateEmail(email) && !validatePassword(password) && !loading;

  // =============== HANDLERS ===============
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Marcar todos los campos como tocados
    setTouched({ email: true, password: true });

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (emailErr || passwordErr) {
      setError('Por favor corrige los errores del formulario');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);

      console.log('✅ Login exitoso:', userData);

      const roleRoutes = {
        1: '/admin',
        2: '/coordinador',
        3: '/instructor',
        4: '/aprendiz',
        5: '/apoyo',
        6: '/apoyo',
      };

      const destino = roleRoutes[userData.rol_id] || '/login';
      console.log('🚀 Redirigiendo a:', destino);

      navigate(destino, { replace: true });
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* --- COLUMNA IZQUIERDA --- */}
      <div className="login-left">
        <div className="left-header">
          <div className="left-logo">
            <img src="/logo-sena.png" alt="Logo SENA" />
            <div className="left-brand">
              <h2>SIPA</h2>
              <span>
                Sistema de Seguimiento
                <br />
                de Etapa Productiva
              </span>
            </div>
          </div>
        </div>

        <div className="left-hero">
          <h1>Bienvenido a SIPA</h1>
          <h3>Sistema de Seguimiento de Etapa Productiva</h3>
          <p>
            Herramienta institucional del SENA para gestionar, hacer seguimiento
            y evaluar la etapa productiva de aprendices de forma eficiente y
            centralizada.
          </p>
        </div>

        <div className="left-footer">
          <div className="feature-badge">
            <i className="fa-solid fa-shield-halved"></i>
            <div>
              <strong>Seguro</strong>
              <small>Tu información está protegida</small>
            </div>
          </div>
          <div className="feature-badge">
            <i className="fa-solid fa-users"></i>
            <div>
              <strong>Centralizado</strong>
              <small>Todo en un solo lugar y al alcance de todos</small>
            </div>
          </div>
          <div className="feature-badge">
            <i className="fa-solid fa-chart-line"></i>
            <div>
              <strong>Eficiente</strong>
              <small>Procesos más ágiles y oportunos</small>
            </div>
          </div>
          <div className="feature-badge">
            <i className="fa-solid fa-clock"></i>
            <div>
              <strong>Confiable</strong>
              <small>Información precisa para la toma de decisiones</small>
            </div>
          </div>
        </div>
      </div>

      {/* --- COLUMNA DERECHA --- */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <div className="header-icon">
              <i className="fa-solid fa-lock"></i>
            </div>
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales para acceder al sistema</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            {/* EMAIL */}
            <div className="form-group">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-envelope"></i>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => handleBlur('email')}
                  placeholder="ejemplo@correo.sena.edu.co"
                  autoComplete="email"
                  className={emailError ? 'input-error' : ''}
                />
              </div>
              {emailError && (
                <small className="field-error">{emailError}</small>
              )}
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label htmlFor="login-password">Contraseña</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-lock"></i>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => handleBlur('password')}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  className={passwordError ? 'input-error' : ''}
                />
                <i
                  className={`fa-solid password-toggle ${
                    showPassword ? 'fa-eye-slash' : 'fa-eye'
                  }`}
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>
              {passwordError && (
                <small className="field-error">{passwordError}</small>
              )}

              <div className="forgot-password">
                <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
              </div>
            </div>

            <button
              type="submit"
              className="btn-login-submit"
              disabled={!isFormValid}
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>

            <div className="divider">
              <span>o continúa con</span>
            </div>

            <button type="button" className="btn-sena-id">
              <i className="fa-solid fa-id-card"></i>
              Iniciar sesión con SENA ID
            </button>

            <p className="login-footer-text">
              ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;