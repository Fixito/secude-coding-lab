# Installation d’OpenSSL avec Scoop

## 1. Installer Scoop

Ouvre **PowerShell** (pas besoin des droits admin), puis exécute :

```PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

## 2. Installer OpenSSL

Une fois Scoop installé :

```bash
scoop install openssl
```

## 3. Vérifier l’installation

Pour vérifier que OpenSSL est correctement installé, exécute :

```bash
openssl version
```
