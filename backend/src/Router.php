<?php

declare(strict_types=1);

class Router
{
    /** @var array<int, array{method:string,pattern:string,handler:callable,auth:?string,roles:array}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler, ?string $auth = null, array $roles = []): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
            'auth' => $auth,
            'roles' => $roles,
        ];
    }

    public function get(string $pattern, callable $handler, ?string $auth = null, array $roles = []): void
    {
        $this->add('GET', $pattern, $handler, $auth, $roles);
    }

    public function post(string $pattern, callable $handler, ?string $auth = null, array $roles = []): void
    {
        $this->add('POST', $pattern, $handler, $auth, $roles);
    }

    public function put(string $pattern, callable $handler, ?string $auth = null, array $roles = []): void
    {
        $this->add('PUT', $pattern, $handler, $auth, $roles);
    }

    public function delete(string $pattern, callable $handler, ?string $auth = null, array $roles = []): void
    {
        $this->add('DELETE', $pattern, $handler, $auth, $roles);
    }

    public function dispatch(string $method, string $uri, array $config): void
    {
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $path = rtrim($path, '/') ?: '/';

        foreach ($this->routes as $route) {
            if ($route['method'] !== strtoupper($method)) {
                continue;
            }

            $regex = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $route['pattern']);
            $regex = '#^' . $regex . '$#';

            if (!preg_match($regex, $path, $matches)) {
                continue;
            }

            $params = [];
            foreach ($matches as $key => $value) {
                if (!is_int($key)) {
                    $params[$key] = urldecode((string) $value);
                }
            }

            $user = null;
            $device = null;

            if ($route['auth'] === 'user') {
                $user = Auth::requireUser($config);
                if ($route['roles']) {
                    Auth::requireRole($user, $route['roles']);
                }
            } elseif ($route['auth'] === 'device') {
                $device = Auth::requireDevice();
            }

            ($route['handler'])($params, $user, $device, $config);
            return;
        }

        Response::error("API endpoint '{$path}' not found.", 404);
    }
}
