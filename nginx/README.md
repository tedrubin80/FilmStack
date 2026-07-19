# Nginx examples

Generic reverse-proxy configs for self-hosted FestScout.

1. Copy `festival.example.conf` / `streaming.example.conf`
2. Replace `YOUR_DOMAIN`
3. Point `root` at your built `dist` folders if the path differs
4. Obtain TLS certificates (certbot or your preferred method)

Do not commit production cert paths or real hostnames.
