# Setup Firebase (simple)

## 1) Creer un projet Firebase
1. Ouvre https://console.firebase.google.com
2. Clique "Add project"
3. Active Firestore Database
4. Active Storage
5. Active Authentication > Sign-in method > Email/Password
6. Cree un utilisateur admin (email + mot de passe)

## 2) Config web
1. Firebase > Project settings > General > Your apps > Web app
2. Recupere les valeurs: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
3. Ouvre `assets/js/firebase-config.js`
4. Remplis les champs

## 3) Security rules (important)

### Firestore rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reviews/{reviewId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Storage rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reviews/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 4) Deploy Vercel
1. Push sur GitHub
2. Vercel > Import repo
3. Deploy

## 5) Utilisation
- Site public: `/`
- Edition: `/modifier.html`
- Connecte-toi avec l'email/mdp admin Firebase
- Ensuite tu peux ajouter/modifier/supprimer des reviews

## 6) Remarque
- Les anciens fichiers API Vercel (`/api/*`) peuvent rester dans le repo, mais le site n'en depend plus.
