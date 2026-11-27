ruta = 'frontend/src/modules/coordinador/pages/VerCertificados.jsx'
with open(ruta, 'r', encoding='utf-8') as f:
    contenido = f.read()

# 1. Insertar la función handleDescargarMasivo si no existe
if 'const handleDescargarMasivo' not in contenido:
    marcador = '  const handleDescargarCertificado = async (certificado) => {'
    funcion = '''  const handleDescargarMasivo = async () => {
    try {
      Swal.fire({
        title: 'Generando ZIP masivo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await fetch('http://localhost:8000/certificados/descargar-masivo', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error al generar los certificados');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificados_masivos.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();

      Swal.fire({
        title: '✅ Descarga completada',
        text: 'Se ha descargado el archivo ZIP con los certificados.',
        icon: 'success',
        confirmButtonColor: '#3ca203',
      });
    } catch (err) {
      Swal.fire({
        title: '❌ Error',
        text: err.message || 'No se pudo descargar los certificados',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

'''
    if marcador in contenido:
        contenido = contenido.replace(marcador, funcion + marcador)
        print('✅ Función handleDescargarMasivo insertada.')
    else:
        print('⚠️ No se encontró el marcador para insertar la función.')

# 2. Conectar el botón "Descargar todos"
# Buscamos cualquier botón que tenga el texto exacto "Descargar todos"
import re
# Buscamos el bloque completo del botón (desde <button hasta </button>)
patron = r'<button[^>]*>\s*(?:<i[^>]*><\/i>)?\s*Descargar todos\s*<\/button>'
match = re.search(patron, contenido, flags=re.DOTALL)

if match:
    boton_viejo = match.group(0)
    # Extraemos los estilos y clases del botón original para conservarlos
    boton_nuevo = boton_viejo.replace('onClick={', 'data-old-onclick={')
    # Le insertamos el nuevo onClick
    boton_nuevo = re.sub(r'<button', '<button onClick={handleDescargarMasivo}', boton_nuevo, count=1)
    
    contenido = contenido.replace(boton_viejo, boton_nuevo)
    print('✅ Botón "Descargar todos" conectado a handleDescargarMasivo.')
else:
    print('⚠️ No se encontró el botón "Descargar todos".')

with open(ruta, 'w', encoding='utf-8') as f:
    f.write(contenido)

print('✅ Proceso terminado.')
