# Korton Stagemarkt Website

Lokale website voor de stagemarkt. Studenten scannen een QR-code en vullen een aanmeldformulier in.

## Opstarten

```bash
npm install
node server.js
```

De terminal toont de URLs en het beheer-wachtwoord bij het opstarten.

| Pagina | URL |
|--------|-----|
| Display (groot scherm) | `http://localhost:3000` |
| Formulier (studenten, via QR) | `http://[lokaal-ip]:3000/form.html` |
| Beheer | `http://localhost:3000/beheer` |

## Configuratie

Maak een `.env` bestand aan (of pas het bestaande aan):

```
ADMIN_PASSWORD=jouw_wachtwoord_hier
```

Pas ook de recruiter-gegevens aan in `public/index.html` — zoek op het ✏️-icoon.

## Structuur

```
public/
  index.html      — display pagina (groot scherm bij de stand)
  form.html       — aanmeldformulier voor studenten
  admin.html      — easter egg
  login.html      — inlogpagina voor beheer
views/
  admin.html      — echte beheerpagina (alleen na inloggen via /beheer)
data/
  registrations.json  — aanmeldingen (automatisch aangemaakt)
server.js
.env              — wachtwoord (niet in git)
```

## Aanmeldingen exporteren

Ga naar `/beheer`, log in en klik op **Exporteer CSV**. Het bestand is direct te openen in Excel.
