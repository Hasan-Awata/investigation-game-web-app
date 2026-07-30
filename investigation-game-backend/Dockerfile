FROM php:8.2-apache
EXTRA_PACKAGES... (or use an official PHP image with Composer)
# Point Apache document root to /var/www/html/public
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN docker-php-ext-install pdo pdo_mysql
COPY . /var/www/html
RUN composer install --no-dev --optimize-autoloader