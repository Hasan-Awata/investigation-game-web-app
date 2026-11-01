FROM php:8.2-apache

# 1. Install development packages and PHP extensions (like pdo_mysql)
RUN apt-get update && apt-get install -y \
    libzip-dev \
    libonig-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo_mysql zip mbstring pcntl \
    && rm -rf /var/lib/apt/lists/*

# 2. Enable Apache mod_rewrite for Laravel route handling
RUN a2enmod rewrite

# 3. Set the working directory inside the container
WORKDIR /var/www/html

# 4. Copy your backend code into the container
COPY . .

# 5. Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 6. Install Laravel dependencies
RUN composer install --no-dev --optimize-autoloader

# 7. Configure Apache to serve the public/ directory
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# 8. Set open permissions to prevent 500 errors on logs and cache
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs storage/app/private public/assets/cases \
    && chown -R www-data:www-data storage bootstrap/cache public/assets/cases \
    && chmod -R u=rwX,g=rX,o= storage bootstrap/cache public/assets/cases \
    && printf '<Directory /var/www/html/public/assets/cases>\nAllowOverride None\nOptions -ExecCGI -Indexes\n<FilesMatch "(?i)\\.(php[0-9]*|phtml|phar|cgi|pl|py|sh)(\\.|$)">\nRequire all denied\n</FilesMatch>\n</Directory>\n' > /etc/apache2/conf-available/case-media.conf \
    && a2enconf case-media

# 9. At runtime: lock in Render environments, migrate DB, and start Apache
CMD php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache && \
    php artisan migrate --force && \
    apache2-foreground
