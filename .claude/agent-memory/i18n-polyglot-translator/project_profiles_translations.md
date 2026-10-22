---
name: project-profiles-translations
description: 2026-10-21 Profiles feature (profiles.* namespace, setup.groupBackup rename, backup/backupImport {name} changes), 11 locales; term map and judgment calls
metadata:
  type: reference
---

"Profile" reuses each locale's existing fileMeta word: de Profil, es Perfil, fil Profile (fil heading "Mga Profile"), fr Profil, it Profilo, ja プロフィール, ko 프로필, pt Perfil, zh 个人资料/個人資料. Group heading is "<Profiles> & Backup" in each locale's own backup word (es "Perfiles y copia", fr "Profils et sauvegarde").
Delete verb: de Löschen, es Eliminar, fil Burahin, fr Supprimer, it Elimina, pt_BR Excluir, pt_PT Eliminar. Start fresh: de Neu anfangen, es Empezar de cero, fil Magsimula nang bago, fr Repartir de zéro, it Ricomincia da zero, ja ゼロから始める, ko 처음부터 시작, pt_BR Começar do zero, pt_PT Começar de raiz, zh 从头开始.
Placeholder traps: ko avoids 을/를/이/가/로 after {name} by following it with the word 프로필 (deleteTitle, switchedToast, nameTaken). fr switchedToast "Passage à {name}." and it "Passato a {name}." dodge gender agreement. profiles.more is an aria label: fr "Plus d'options pour", pt "Mais opções para", ja "{name}のその他の操作".
backupImport.doneTitle keeps the moving metaphor with {name} as subject (de eingezogen, fr a fini d'emménager, it Trasloco di {name} completato, pt Mudança de {name} concluída, ko 이사, zh 搬家完成).
Backup-tab strings (addAsNew, replace) are not popup-constrained; profiles.new/copyCurrent/startFresh are (320px popup).
Keyword strings stay accent-free for de/es/fr/pt (search folds diacritics); de uses "loschen"/"ubertragen" to dodge ß/ü normalization.
