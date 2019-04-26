;;; https://searchcode.com/file/107184872/flycheck-typescript.el

(require 'flycheck)

(setq sdh-ts-root
      (file-name-directory (directory-file-name (file-name-directory load-file-name))))

(flycheck-define-checker typescript-tsc
  "A TypeScript syntax checker using tsc, the TypeScript compiler.
See URL `http://www.typescriptlang.org/'."
  :command ("flycheck-tsc" source-inplace)
  :working-directory (lambda (x) sdh-ts-root)
  :error-patterns
  ((error line-start (file-name) "(" line "," column "): error"
          (message (one-or-more not-newline)
                   (zero-or-more "\n\t" (one-or-more not-newline)))
          line-end))
  :modes typescript-mode
  :next-checkers ((warnings-only . typescript-tslint))
)

(flycheck-def-config-file-var flycheck-tslint.json typescript-tslint "tslint.json")

(flycheck-define-checker typescript-tslint
  "A TypeScript style checker using tslint.

See URL `https://github.com/palantir/tslint'."
  :command ("tslint"
            "--project" "tsconfig.json"
            "--config" "tslint.json"
            source-inplace)
  :working-directory (lambda (x) sdh-ts-root)
  :error-patterns ((warning "ERROR: " (file-name) ":" line ":" column " - " (message)))
  :modes typescript-mode)

;; Link to the correct checker script...?
(setq flycheck-typescript-tsc-executable (concat (file-name-directory load-file-name) "flycheck-tsc"))
(setq flycheck-typescript-tslint-executable (concat sdh-ts-root "node_modules/tslint/bin/tslint"))


(defun sdh-ts-init ()
  (flycheck-mode)
  (global-set-key (kbd "C-c C-e") 'flycheck-display-error-at-point)
)

(add-hook 'typescript-mode-hook 'sdh-ts-init)

(add-to-list 'flycheck-checkers 'typescript-tsc)
(add-to-list 'flycheck-checkers 'typescript-tslint)
