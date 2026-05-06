FROM nginx:alpine

# Copiar archivos de la aplicación
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Configuración básica de Nginx
# (ya viene optimizado por defecto en nginx:alpine)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]