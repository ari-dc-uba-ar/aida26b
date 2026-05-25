# Modificaciones para compilación

Partimos de la siguiente estructura de carpetas:
```
root/
├── frontend/
│   └── src/
|       ├── ...
│       ├── ssot/
│       ├── utils/
│       └── types/
├── backend/
│   └── src/
|       ├── ...
│       ├── ssot/
│       ├── utils/
│       └── types/
```

Y queremos migrar a una donde las carpetas compartidas se encuentren en un sólo lugar, por ejemplo `shared`.

```
root/
├── shared/
│   └── src/
│       ├── ssot/
│       ├── utils/
│       └── types/
│
├── frontend/
│   └── src/
│
├── backend/
│   └── src/
│
├── package.json
└── tsconfig.base.json
```

1. Incorporamos archivos `tsconfig.base.json` y `package.json` al directorio `root`.
2. Definimos `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler", //Para usar webpack

    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,

    "baseUrl": ".", //Nos permite definir como carpeta base a aquella donde se encuentra este tsconfing.json (root) sobre la cual se resolverán los imports relativos

    "paths": {
      "@shared/*": ["shared/src/*"] //Definimos un path, de este modo cuando queramos referirnos a "shared/src" en alguna ruta podemos usar directo "@shared/"
    },

  }
}
```

Dentro de `frontend` y `backend` debemos tener sus propios `tsconfig.json` con lo específico para esas carpetas. Podemos usar herencia con `extends` y el `tsconfig.base.json`.

- *Frontend tsconfig*

```JSON
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    //Usamos module: ESnext heredado del tsconfig.base.json, recomendado por https://www.typescriptlang.org/tsconfig/#Modules_6244 para bundlers
    "outDir": "./dist", //Compilados irán a frontend/dist
    "rootDir": "..", //Su root dir será el de root así tenemos acceso a shared
    "moduleResolution": "bundler" //No requiere file extensions en los imports
    //In brief, moduleResolution controls how TypeScript resolves module specifiers (string literals in import/export/require statements) to files on disk, and should be set to match the module resolver used by the target runtime or bundler.
  },
  "include": [
    "src",
    "../shared/src"
  ] //Indicamos lo que queremos que incluya la carpeta frontend/src y shared/src 
}
```

- *Backend tsconfig*

```JSON
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist", //Compilados irán a backend/dist
    "rootDir": "..", //Su root dir será el de root, asi tenemos acceso a shared
    "module": "CommonJS", //Pisamos valores del config.base
    "moduleResolution": "Node" //Pisamos valores del config.base
  },
  "include": [
    "src",
    "../shared/src"
  ] //Indicamos lo que queremos que incluya la carpeta backend/src y shared/src 
}
```