# fix_rf101.py
ruta = 'frontend/src/modules/coordinador/pages/CartasPresentacion.jsx'

with open(ruta, 'r', encoding='utf-8') as f:
    contenido = f.read()

# 1. Insertar la función handleCambiarEstado antes de handleVer
if 'const handleCambiarEstado' not in contenido:
    marcador = '  const handleVer = (carta) => {'
    nueva_funcion = """  const handleCambiarEstado = async (cartaId, nuevoEstado) => {
    try {
      Swal.fire({
        title: 'Actualizando estado...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      
      await cartaPresentacionService.actualizarEstado(cartaId, nuevoEstado);
      
      const resCartas = await cartaPresentacionService.listar();
      setCartas(resCartas.cartas || []);
      
      Swal.fire({
        title: '✅ Estado actualizado',
        text: `La carta ha sido ${nuevoEstado === 'APROBADA' ? 'aprobada' : 'rechazada'} correctamente.`,
        icon: 'success',
        confirmButtonColor: '#3ca203',
        timer: 2500,
      });
    } catch (err) {
      Swal.fire({
        title: '❌ Error',
        text: err.message || 'No se pudo actualizar el estado',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

"""
    if marcador in contenido:
        contenido = contenido.replace(marcador, nueva_funcion + marcador)
        print("✅ Función handleCambiarEstado insertada.")

# 2. Reemplazar el botón de Eliminar por el grupo de botones de estado
# Buscamos el bloque desde el botón de eliminar (que ya existe)
import re

# Buscamos el bloque del botón de eliminar actual (con sus estilos)
patron_boton = r'(<button\s+onClick=\{\(\) => handleEliminar\(carta\)\}.*?</button>)'

nuevo_bloque = """<div style={{ display: 'flex', gap: '6px' }}>
                        {carta.estado !== 'APROBADA' && (
                          <button
                            onClick={() => handleCambiarEstado(carta.id, 'APROBADA')}
                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <i className="fas fa-check" /> Aprobar
                          </button>
                        )}
                        {carta.estado !== 'RECHAZADA' && (
                          <button
                            onClick={() => handleCambiarEstado(carta.id, 'RECHAZADA')}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <i className="fas fa-times" /> Rechazar
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminar(carta)}
                          style={{ background: '#6b7280', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="fas fa-trash" /> Eliminar
                        </button>
                      </div>"""

if re.search(patron_boton, contenido, flags=re.DOTALL):
    contenido = re.sub(patron_boton, nuevo_bloque, contenido, flags=re.DOTALL)
    print("✅ Botones de Aprobar/Rechazar insertados.")
else:
    print("⚠️ No se encontró el botón de Eliminar exacto. Revisa el archivo manualmente.")

with open(ruta, 'w', encoding='utf-8') as f:
    f.write(contenido)

print("✅ Proceso terminado.")
