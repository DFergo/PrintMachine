# PrintMachine - Industrial Printer 3D Demo

Demo interactiva de una máquina de impresión industrial en 3D con controles web.

## Características
- Visualización 3D interactiva con Three.js
- Componentes desmontables para ver el mecanismo interno
- Controles de operación: iniciar, pausa, detener
- Control de velocidad de impresión
- Vistas múltiples (isométrica, frontal, superior)
- Animaciones realistas de los componentes móviles

## Despliegue con Docker

### Método 1: build y run manual
```bash
cd /Users/daniel/industrial-printer-app
docker build -t printmachine-demo .
docker run -p 8333:80 printmachine-demo
```

### Método 2: docker-compose
```bash
cd /Users/daniel/industrial-printer-app
docker-compose up -d
```

### En Portainer
1. Sube este repositorio a Portainer como Stack
2. O usa Stack > Add stack > Upload un docker-compose.yml
3. Click "Deploy the stack"
4. Accede en `http://tu-servidor:8333`

## Acceso
- Local: http://localhost:8333
- En red: http://<ip-máquina>:8333

## Tecnologías
- Three.js r128
- OrbitControls
- HTML5 Canvas
- CSS3

## Optimizaciones
- Lazy loading de librerías
- Código minimizado
- Sin dependencias pesadas
- Carga rápida incluso en móviles
# PrintMachine
