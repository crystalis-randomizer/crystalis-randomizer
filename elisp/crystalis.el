(load-file (concat (file-name-directory load-file-name) "asm.el"))
(setq crystalis-root-path
      (file-name-directory (directory-file-name (file-name-directory load-file-name))))

(defun crystalis-checkout-source ()
  "Checks out the source, making it read-write"
  (interactive)
  (if (and
       (string= "Crystalis.s" (file-name-nondirectory buffer-file-name))
       (= 0 (shell-command (format "cd %s; scripts/update.sh out" crystalis-root-path))))
      (read-only-mode 0)))

(defun crystalis-checkin-source ()
  "Checks in the source, making it read-only"
  (interactive)
  (if (and
       (string= "Crystalis.s" (file-name-nondirectory buffer-file-name))
       (= 0 (shell-command (format "cd %s; scripts/update.sh in" crystalis-root-path))))
      (read-only-mode 1)))

(defun crystalis-merge-source ()
  "Merges the source with upstream, making it read-write"
  (interactive)
  (if (and
       (string= "Crystalis.s" (file-name-nondirectory buffer-file-name))
       (= 0 (shell-command (format "cd %s; scripts/update.sh merge" crystalis-root-path))))
      (read-only-mode 0)))

(defun crystalis-label-exits ()
  "Labels the exits for a mapdata block."
  (interactive)
  (let (name addr)
    (re-search-backward "^MapData_\\([A-Za-z0-9]+\\)")
    (setq name (match-string 1))
    (re-search-forward "\\.word")
    (re-search-forward "\\.word")
    (re-search-forward "\\.word")
    (re-search-forward "\\.word (\\$")
    (setq addr (+ #xc000 (asm/parse-number)))
    (asm-goto-position (format "%x" addr))
    (asm-split)
    (beginning-of-line)
    (insert "MapData_" name "_Exits\n")
    (asm/convert-to-bytes-one)
    (while (and (not (looking-back "\\$ff\n")) (asm/re/on-line asm/re/byte-line))
      (asm/convert-to-bytes-one)
      (asm/convert-to-bytes-one)
      (asm/convert-to-bytes-one)
      (backward-char) (previous-line) (asm-join) (previous-line) (asm-join) (previous-line) (asm-join)
      (end-of-line) (forward-char)
      (asm/convert-to-bytes-one))))

(defun crystalis-group-bytes-until-ff (count)
  "Makes lines of 'count' bytes, terminated by an $ff."
  (interactive "nGroup size: ")
  (let ((pos (point))
        (addr (asm/get-position))
        bytes)
    (setq bytes (asm/get-number-of-bytes 1))
    (while (/= #xff (car bytes))
      (setq bytes (append bytes (asm/get-number-of-bytes (- count 1))))
      (asm/delete-range pos (point))
      (asm/insert-bytes bytes addr)
      (setq addr (+ addr count))
      (setq pos (point))
      (setq bytes (asm/get-number-of-bytes 1)))))

(defun crystalis-format-monster-data ()
  (interactive)
  (let (pos bytes num start end)
    (re-search-forward ";;; -----")
    (beginning-of-line)
    (setq p2 (point-marker))
    (re-search-backward "MonsterData_")
    (forward-char)
    (beginning-of-line)
    (next-line)
    (setq pos (asm/get-position))
    (setq p1 (point-marker))
    (setq bytes (asm/get-bytes-until p2))
    (asm/delete-range p1 p2)
    (asm/insert-bytes (list (car bytes)) pos)
    (setq pos (+ 1 pos))
    (setq bytes (cdr bytes))
    (while bytes
      (setq num (+ 1 (asm/count-bits (car bytes))))
      (asm/insert-bytes (asm/seq-take bytes num) pos)
      (setq pos (+ num pos))
      (setq bytes (asm/seq-drop bytes num)))))

(defun crystalis-label-map ()
  (interactive)
  (let (b1 b2 bytes x y)
    (re-search-backward ";;; ------")
    (re-search-forward "\\.word (\\$")
    (setq b1 (+ #xc000 (asm/parse-number)))
    (re-search-forward "\\.word (\\$")
    (setq b2 (+ #xc000 (asm/parse-number)))
    (re-search-forward "\\.word (\\$" nil nil 3)
    (save-excursion (goto-char (asm/find-position b2)) (asm-split))
    (end-of-line) (forward-char)
    (setq bytes (asm/get-number-of-bytes (- b2 b1)))
    (asm/delete-range (asm/find-position b1) (- (asm/find-position b2) 1))
    (asm/insert-bytes (asm/seq-take bytes 1) b1)
    (setq b1 (+ 1 b1))
    (setq bytes (cdr bytes))
    (setq x (+ 1 (car bytes)))
    (setq y (+ 1 (cadr bytes)))
    (asm/insert-bytes (asm/seq-take bytes 4) b1)
    (insert (format "        ;; Map %dx%d\n" x y))
    (setq b1 (+ 4 b1))
    (setq bytes (asm/seq-drop bytes 4))
    (while bytes
 (message "bytes: %s" (mapcar asm/hex bytes))
      (asm/insert-bytes (asm/seq-take bytes x) b1)
      (setq b1 (+ x b1))
      (setq bytes (asm/seq-drop bytes x)))))

; Keyboard macro to label MapData - assume a second copy of the buffer is at C-x p
(fset 'kb-label-mapdata
   (lambda (&optional arg) "Keyboard macro." (interactive "p") (kmacro-exec-ring-item (quote ([19 58 32 134217842 46 46 36 13 67108896 C-left 24 114 115 50 left left 67108896 C-left right 24 114 115 49 5 24 114 32 51 3 97 24 114 105 49 13 C-return 1 13 up 77 97 112 68 97 116 97 95 76 111 99 97 116 105 111 110 24 114 105 50 1 13 127 127 127 127 127 127 127 127 up 59 59 21 21 21 17 45 down 59 32 76 111 99 97 116 105 111 110 32 24 114 105 50 18 59 13 134217848 115 100 104 32 112 117 115 104 9 13 53 53 13 down 1 3 23 3 23 3 23 3 23 3 23 134217848 99 114 121 115 116 97 108 105 115 45 108 97 98 101 108 45 101 120 105 116 115 13 24 114 32 52 24 114 106 51 24 112 24 114 106 52 24 111] 0 "%d")) arg)))

(fset 'km-label-named-npcdata
   (lambda (&optional arg) "Keyboard macro." (interactive "p") (kmacro-exec-ring-item (quote ([134217747 59 32 92 36 46 46 46 46 46 58 32 46 46 36 13 C-left C-left C-left right 67108896 C-right 24 114 115 49 right right 67108896 right right 24 114 115 50 24 114 32 52 3 97 24 114 105 49 13 C-return 1 59 59 59 21 21 21 17 45 13 127 127 127 127 127 127 127 127 78 112 99 68 97 116 97 95 76 111 99 97 116 105 111 110 24 114 105 50 left left 134217845 59 32 76 111 99 97 116 105 111 110 32 24 114 105 50 18 59 13 134217848 115 100 104 32 112 117 115 104 9 13 53 53 13 24 114 32 53 24 114 106 52 24 112 24 114 106 53 12 24 111] 0 "%d")) arg)))

; Looks for ": e7 =JoelInn" and replaces "LocationE7" with "JoelInn", maintaining comment position, etc
(fset 'km-apply-location-names
   (lambda (&optional arg) "Keyboard macro." (interactive "p") (kmacro-exec-ring-item (quote ([134217788 134217747 58 32 46 46 32 61 13 127 left 67108896 left left 24 114 115 49 right right right 67108896 5 24 114 115 50 134217788 134217786 40 114 101 45 115 101 97 114 99 104 45 102 111 114 119 97 114 100 32 34 34 41 left left 58 32 24 114 105 49 36 13 32 24 114 105 50 134217788 134217786 40 114 101 45 115 101 97 114 99 104 45 102 111 116 119 97 114 100 127 127 127 127 127 114 119 97 114 100 32 34 76 111 99 97 116 105 111 110 32 127 24 114 105 49 left left 134217845 34 41 13 18 95 right 67108896 19 59 left 24 119 24 114 105 50 134217848 115 100 104 32 112 117 115 104 9 13 53 53 13 134217786 40 114 101 45 115 101 97 114 99 104 45 102 111 116 119 97 114 100 127 127 127 127 127 114 119 97 114 100 32 34 76 111 99 97 116 105 111 110 32 127 24 114 105 49 left left 134217845 34 41 13 18 95 right 67108896 5 24 119 24 114 105 50 134217786 40 114 101 45 115 101 97 114 99 104 45 102 111 116 119 97 114 100 127 127 127 127 127 114 119 97 114 100 32 34 76 111 99 97 116 105 111 110 32 127 24 114 105 49 left left 134217845 34 41 13 18 95 right 67108896 19 59 left 24 119 24 114 105 50 134217848 115 100 104 32 112 117 115 104 9 13 53 53 13] 0 "%d")) arg)))

;; does this work?
;; (fset 'km-find-next-code
;;    (lambda () (kmacro-exec-ring-item (kbd "C-x o M-C-s \ b[^0]0 \ b RET 3*<left> C-SPC C-x r SPC 1 C-x o (format SPC \"%x\" S-SPC (/ SPC C-x r i 1 SPC 3)) LFD <up> <right> C-SPC <C-right> M-w <right> M-> C-x o C-c a C-y RET C-SPC C-x o M-C-s \ b[ DEL 0[^0] \ b RET 3*<left> C-x r SPC 2 C-x r j 1 C-SPC C-x r j 2 M-: (add-text-properties(region-be ginning)(region-end)'(face SPC font-lock-warning-face)) RET C-x o (format SPC \"%x\" S-SPC (/ SPC C-x r i 2 SPC 3)) LFD <up> <right> C-SPC <C-right> M-w C-x o C-SPC C-c a C-y RET C-x q <C-return> C-a C-x C-x <C-return> C-a C-x C-a C-c C-c C-s $ RET C-SPC <C-right> M-w C-u C-SPC C-a C-o DEL DataTable_ C-y C-x C-x C-c i -"))))

(fset 'km-find-next-code
   (lambda (&optional arg) (interactive "p") (kmacro-exec-ring-item `(,(kbd "C-x o M-C-s \\ b[1-9a-f][0-9a-f] \\ b RET 3*<left> C-SPC C-x r SPC 1 C-x o (format SPC \"%x\" S-SPC (/ SPC C-x r i 1 SPC 3)) LFD <up> <right> C-SPC <C-right> M-w <right> M-> C-x o C-c a C-y RET C-SPC C-x o M-C-s \\ b 0[01-9a-f] \\ b RET 3*<left> C-x r SPC 2 C-x r j 1 C-SPC C-x r j 2 C-c 1 h C-x o (format SPC \"%x\" S-SPC (/ SPC C-x r i 2 SPC 3)) LFD <up> <right> C-SPC <C-right> M-w C-x o C-SPC C-c a C-y RET") 0 "%d") arg)))
;(define-key asm-mode-map (kbd "C-.") 'km-find-next-code)

(fset 'km-disassemble-next-code
   (lambda (&optional arg) (interactive "p") (kmacro-exec-ring-item `(,(kbd "C-c x <C-return> C-a C-x C-x <C-return> C-a C-x C-a C-c C-c C-c i d C-x C-x C-c i -") 0 "%d") arg)))
;(define-key asm-mode-map (kbd "C-/ C-.") 'km-disassemble-next-code)


(defun sdh-ensure-point-after-mark ()
  (interactive)
  (if (< (point) (mark)) (exchange-point-and-mark)))
;(global-set-key (kbd "C-c x") 'sdh-ensure-point-after-mark)

(defun sdh-highlight-region ()
  (interactive)
  (add-text-properties
   (region-beginning) (region-end) '(face font-lock-warning-face)))
;(global-set-key (kbd "C-c 1 h") 'sdh-highlight-region)

(defun sdh-insert-datatable-label ()
  (interactive)
  (save-excursion
    (let (b e a)
      (beginning-of-line)
      (re-search-forward "\\$")
      (setq b (point))
      (re-search-forward " ")
      (setq e (point))
      (setq a (buffer-substring-no-properties b e))
      (beginning-of-line)
      (insert "DataTable_" a "\n"))))
;(define-key asm-mode-map (kbd "C-c i d") 'sdh-insert-datatable-label)

; assoc
; save-excursion doesn't help for switch-to-buffer...?
;  - could require window to be open???
;  - with-current-buffer

;; NOTE: leaving out (asl dec inc lsr rol ror sta stx sty) because
;; we only care about paged ROM, so mutating is irrelevant.
(defconst sdh-banked-read-re
  (rx
   (or
    "adc"
    "and"
    "cmp"
    "cpx"
    "cpy"
    "eor"
    "jmp"
    "jsr"
    "lda"
    "ldx"
    "ldy"
    "ora"
    "sbc")
   (one-or-more space)
   (repeat 0 2 "(")
   "$"
   (any "8-9a-f") (= 3 (any "0-9a-f")))
   word-end)

(defconst sdh-banked-pages
  (mapcar (lambda (x)
            (cons (format "%08x" (lsh 1 x)) (lsh x 13)))
          (number-sequence 0 #x1f)))

(setq sdh-find-banked-read-repeat-keymap
      (let ((map (make-sparse-keymap)))
        (define-key map (kbd "C-f") 'sdh-find-banked-read)
        map))

(defun sdh-find-banked-read ()
  (interactive)
  (let (addr num cov pages page)
    (re-search-forward sdh-banked-read-re)
    (backward-char)
    (setq num (asm/parse-number))
    (cond
     ((< num #xc000)
      (setq cov (if (< num #xa000) "cov.lo" "cov.hi"))
      (setq addr (asm/get-position))
      (setq pages
            (with-current-buffer cov
              (goto-char (+ (* addr 9) 1))
              (buffer-substring-no-properties (point) (+ 8 (point)))))
      (setq page (assoc pages sdh-banked-pages))
      (if page
          (progn
            (backward-char 3)
            (delete-char 4)
            (insert (format "%05x" (logior (cdr page) (logand #x1fff num)))))
        (error "Non-unique page: %s" pages)))
     (t
      (backward-char 3)
      (insert "3"))))
  (set-transient-map sdh-find-banked-read-repeat-keymap))

;(define-key asm-mode-map (kbd "C-c C-f") 'sdh-find-banked-read)

(fset 'kb-convert-next-ascii
   [?\C-  C-return ?\C-a ?\C-  ?\C-s ?\M-r ?\\ ?$ ?\[ ?0 ?1 ?8 ?9 ?a ?b ?c ?d ?e ?f ?\] C-left C-return ?\C-a ?\C-x ?\C-a ?\C-c ?\C-t ?\C-, ?\C-e ?\C-,])

(defun sdh-next-value ()
  (interactive)
  (if (looking-at "^\\|$") (re-search-forward "\\.byte[ \t]*"))
  (while (looking-at "[ \t,]") (forward-char))
  (cond
   ((looking-at "\\$") (forward-word))
   ((looking-at "\"") (forward-char) (re-search-forward "\"") (forward-char))
   (t (error "Unknown value"))))

(defun sdh-maybe-asm-join ()
  (cond
   ((looking-back ","))
   ((looking-at ","))
   (t (message "eek") (asm-join))))

(defun sdh-process-dialog ()
  (interactive)
  (if (looking-at "^\\|$") (re-search-forward "\\.byte[ \t]*"))
  (while (looking-at "[ \t,]") (forward-char))
  (cond
   ((looking-at "\\$01") (asm-split) (sdh-next-value) (sdh-maybe-asm-join))
   ((looking-at "\\$02") (sdh-next-value) (asm-split) (insert "    "))
   ((looking-at "\\$0[03]") (sdh-next-value) (asm-split))
   ((looking-at "\\$0[5-9]") (sdh-next-value) (sdh-maybe-asm-join) (sdh-next-value) (sdh-maybe-asm-join))
   ((looking-at "\\$[89abcdef]\\|\\$\\(?:04\\|22\\)\\|\"") (sdh-next-value) (sdh-maybe-asm-join))
   (t (error "unexpected"))))
;(global-set-key (kbd "C-4") 'sdh-process-dialog)

;; (defun sdh-process-dialog ()
;;   (interactive)
;;   (let (s e)
;;     (cond
;;      ((looking-at "\\$[")
;;       (setq s (point))
;;       (re-search-forward "$"

(defun sdh-process-trigger ()
  (interactive)
    (let (s e (asm/bytes-width 2) (mode 0) b0 b1 a n f)
      (re-search-backward ";;")
      (next-line)
      (beginning-of-line)
      (setq s (point-marker))
      (re-search-forward ";;")
      (beginning-of-line)
      (setq e (point-marker))
      (asm/convert-to-bytes-region s e)
      (re-search-forward ";;")
      (beginning-of-line)
      (setq e (point-marker))
      (goto-char s)
      (while (and (< mode 3) (re-search-forward "\\.byte " e t))
        (setq b0 (asm/parse-number))
        (re-search-forward ",")
        (setq b1 (asm/parse-number))
        (end-of-line)
        (cond
         ((= mode 0) ; condition
          (if (> (logand b0 #x80) 0) (setq mode 1))
          (setq n (if (= 0 (logand b0 #x20)) "" " NOT"))
          (setq f (logior (lsh (logand b0 #x07) 8) b1))
          (insert (format " ; Condition: %03x%s" f n)))
         ((= mode 1)
          (setq mode 2)
          (setq a (lsh b0 -3))
          (setq n (logior (lsh (logand b0 #x07) 3) (lsh b1 -5)))
          (setq f (logand b1 #x1f))
          (if (or (> n 0) (> f 0))
              (insert (format " ; Message %02x:%02x" n f)))
          (if (> a 0) (insert (format " ; Action: %02x" a))))
         ((= mode 2)
          (if (not (logand b0 #x40)) (setq mode 3))
          (setq a (if (= 0 (logand b0 #x80)) "Set" "Clear"))
          (setq f (logior (lsh (logand b0 #x07) 8) b1))
          (if (> f 0) (insert (format " ; %s: %03x" a f))))))
    (goto-char e)
    (next-line 1)))
;(define-key asm-mode-map (kbd "C-c C-t") 'sdh-process-trigger)

(defun sdh/next-byte (end)
  (and (re-search-forward "\\(\\.byte \\|,\\)$[0-9a-f][0-9a-f]" end t)
       (asm/parse-number)))
;(defun sdh/split-after (end)
;  (save-excursion (sdh/next-byte end) (asm-split)))

(defun sdh/format-message (b0 b1)
  (let* ((bank (logior (lsh (logand b0 #x07) 3) (lsh b1 -5)))
         (index (logand b1 #x1f))
         (action (lsh b0 -3)))
    (format "%02x:%02x%s" bank index (if (> action 0) (format " (action %02x)" action) ""))))

(defun sdh/format-flag (b0 b1)
  (let* ((flag (logior (lsh (logand b0 #x07) 8) b1))
         (notp (if (sdh/bitp b0 #x20) " NOT" "")))
    (if (and (= flag 0) (string= notp " NOT"))
        "default"
      (format "%03x%s%s" flag notp (sdh/get-flag flag)))))

(defun sdh/format-setflag (b0 b1)
  (let* ((flag (logior (lsh (logand b0 #x07) 8) b1))
         (notp (if (sdh/bitp b0 #x80) "Clear" "Set")))
    (format "%s: %03x%s" notp flag (sdh/get-flag flag))))

(defun sdh-insert-setflag ()
  (interactive)
  (let (b0 b1 bs)
    (end-of-line)
    (save-excursion
      (beginning-of-line)
      (setq bs (asm/get-number-of-bytes 2))
      (setq b0 (car bs))
      (setq b1 (cadr bs)))
    (insert (format " ; %s" (sdh/format-setflag b0 b1)))))
;(define-key asm-mode-map (kbd "C-c f") 'sdh-insert-setflag)

(defun sdh/bitp (byte mask)
  (> (logand byte mask) 0))

(defun sdh/get-npc (id)
  (with-current-buffer "npcs"
    (save-excursion
      (beginning-of-buffer)
      (if (re-search-forward (format "^%02x" id) nil t)
          (progn
            (if (not (looking-at "$")) (forward-char))
            (buffer-substring-no-properties (point) (line-end-position)))
        ""))))

(defun sdh/get-location (id)
  (with-current-buffer "locations"
    (save-excursion
      (beginning-of-buffer)
      (re-search-forward (format "^$%02x" id))
      (forward-char)
      (buffer-substring-no-properties (point) (line-end-position)))))

(defun sdh/get-item (id)
  (with-current-buffer "items"
    (save-excursion
      (beginning-of-buffer)
      (re-search-forward (format "^%02x - " id))
      (buffer-substring-no-properties (point) (line-end-position)))))

(defun sdh/get-trigger (id)
  (with-current-buffer "triggers"
    (save-excursion
      (beginning-of-buffer)
      (re-search-forward (format "^%02x - " id))
      (buffer-substring-no-properties (point) (line-end-position)))))

(defun sdh/get-flag (id)
  (with-current-buffer "flags"
    (save-excursion
      (beginning-of-buffer)
      (cond
       ((re-search-forward (format "^%03x - " id) nil t)
        (backward-char)
        (replace-regexp-in-string
                     " *(.*" "" (buffer-substring-no-properties (point) (line-end-position))))
       (t "")))))

(defun sdh-process-dialog ()
  (interactive)
    (let (s e (asm/bytes-width 1000) (mode 0) b0 b1 b2 b3 b4 a n f m (c 0) (ls nil))
      (re-search-backward ";; [0-9a-f]")
      (next-line)
      (beginning-of-line)
      (setq s (point-marker))
      (re-search-forward ";; [0-9a-f]")
      (beginning-of-line)
      (setq e (point-marker))
      (asm/convert-to-bytes-region s e)
      (re-search-forward ";; [0-9a-f]")
      (beginning-of-line)
      (setq e (point-marker))
      (goto-char s)
      (while (and (< mode 4) (progn (setq b0 (sdh/next-byte e)) b0))
        (cond
         ((= mode 0) ; condition
          (setq b1 (sdh/next-byte e))
          (setq b2 (sdh/next-byte e))
          (setq b3 (sdh/next-byte e))
          (if (sdh/bitp b0 #x80) (setq mode 1))
          (save-excursion (asm-split))
          (end-of-line)
          (setq f (sdh/format-flag b0 b1))
          (if (string= f "000 unused") nil
            (insert (format "     ; %s -> %s" (sdh/format-flag b0 b1) (sdh/format-message b2 b3)))))
         ((and (= mode 1) (= b0 255))
          (setq ls (nreverse ls))
          (setq mode 2)
          (save-excursion (asm-split)))
         ((= mode 1)
          (setq b1 (sdh/next-byte e))
          (save-excursion (asm-split))
          (setq ls (cons (cons b1 b0) ls))) ; offset.location
         ((= mode 2)
          (if (and ls (>= c (caar ls)))
              (save-excursion
                ;; add a comment indicating location
                (setq a (cdar ls))
                (setq ls (cdr ls))
                (beginning-of-line)
                (insert (format "        ;;                  %02x: %02x %s\n" c a (sdh/get-location a)))))
          (setq b1 (sdh/next-byte e))
          (setq b2 (sdh/next-byte e))
          (setq b3 (sdh/next-byte e))
          (setq b4 (sdh/next-byte e))
          (save-excursion (asm-split))
          (end-of-line)
          (if (sdh/bitp b0 #x40) (setq mode 3))
          (setq a (if (and (> b4 0) (/= b4 c)) (format " -> @ %02x" b4) ""))
          (setq c (+ c 5))
          (insert (format " ; %s -> %s%s" (sdh/format-flag b0 b1) (sdh/format-message b2 b3) a)))
         ((= mode 3)
          (setq c (+ c 2))
          (setq b1 (sdh/next-byte e))
          (save-excursion (asm-split))
          (re-search-backward ".byte")
          (re-search-forward " ")
          (insert "        ")
          (end-of-line)
          (if (sdh/bitp b0 #x40) (setq mode 2))
          (insert (format "     ;     %s" (sdh/format-setflag b0 b1))))))
    (goto-char e)
    (next-line 1)))
;(define-key asm-mode-map (kbd "C-c C-d") 'sdh-process-dialog)

(defun sdh-process-npc-spawn ()
  (interactive)
    (let (s e (asm/bytes-width 1000) (mode 0) b0 b1 b2 b3 b4 a n f m (c 0) (ls nil))
      (re-search-backward ";; [0-9a-f]")
      (next-line)
      (beginning-of-line)
      (setq s (point-marker))
      (re-search-forward ";; [0-9a-f]")
      (beginning-of-line)
      (setq e (point-marker))
      (asm/convert-to-bytes-region s e)
      (re-search-forward ";; [0-9a-f]")
      (beginning-of-line)
      (setq e (point-marker))
      (goto-char s)
      (while (and (< mode 2) (progn (setq b0 (sdh/next-byte e)) b0))
        (cond
         ((and (= mode 0) (= b0 255))
          (setq mode 3))
         ((= mode 0) ; location
          (setq mode 1)
          (save-excursion (asm-split))
          (end-of-line)
          (insert " ; " (sdh/get-location b0)))
         ((= mode 1)
          (setq b1 (sdh/next-byte e))
          (if (sdh/bitp b0 #x80) (setq mode 0))
          (save-excursion (asm-split))
          (end-of-line)
          (insert " ; " (sdh/format-flag b0 b1)))))
    (goto-char e)
    (next-line 1)))
;(define-key asm-mode-map (kbd "C-c C-s") 'sdh-process-npc-spawn)


(defun sdh-cov ()
  (interactive)
  (save-excursion
    (beginning-of-line)
    (re-search-forward "^\\(?:[-+ \t]\\|[a-z]+:[ \t]\\)*\\$\\([0-9a-f]\\{5\\}\\)")
    (message (shell-command-to-string (format "echo -n `./scripts/cov %d`" (asm/parse-number))))))
(define-key asm-mode-map (kbd "C-c C-f") 'sdh-cov)


(defun set-column-width (width)
  (interactive "nColumns: ")
  (save-excursion
    (let* ((start (progn (beginning-of-line) (point)))
           (total (progn (end-of-line) (- (point) start)))
           (semi (progn (beginning-of-line) (re-search-forward ";") (point)))
           (space (progn (backward-char) (re-search-backward "[^ ]") (forward-char)
                         (- semi (point))))
           (del (min space (- total width))))
      (if (> del 0)
          (delete-char del)
        (insert (format (format "%% %ds" (- del)) ""))))))

(defun annotate-npcdata ()
  (interactive)
  (save-excursion
    (end-of-line)
    (if (re-search-backward " *;" (line-beginning-position) t)
        (progn (backward-char) (kill-line) (end-of-line)))
    ;; TODO - remove existing comments
    (let* ((line (line-number-at-pos))
           (start (save-excursion (re-search-backward "NpcData_") (line-number-at-pos)))
           (slot (+ #xb (- line start)))
           (type (save-excursion (backward-char 5) (char-after)))
           (arg (save-excursion (asm/parse-number))))
      (insert (format " ; %02x" slot))
      (cond
       ((and (= type ?2) (< arg #x80)) (insert " " (sdh/get-item arg)))
       ((= type ?2) (insert " " (sdh/get-trigger arg)))
       ((= type ?1) (insert " " (sdh/get-npc arg))))
      ;; TODO - add more info - want object names...
)))
;(define-key asm-mode-map (kbd "C-c C-n") 'annotate-npcdata)

;(define-key asm-mode-map (kbd "C-c s o") 'crystalis-checkout-source)
;(define-key asm-mode-map (kbd "C-c s i") 'crystalis-checkin-source)
;(define-key asm-mode-map (kbd "C-c s m") 'crystalis-merge-source)

(defun link-data-table-entry ()
  (interactive)
  (save-excursion
    (beginning-of-line)
    (re-search-forward "\\.word (\\$\\([0-9a-f]+\\)) ; \\([0-9a-f]+\\) *\\(.*\\)")
    (let* ((addr (match-string 1))
           (num (match-string 2))
           (label (match-string 3))
           (table (save-excursion
                    (re-search-backward "^\\([A-Z][A-Za-z0-9_]+\\)")
                    (replace-regexp-in-string "Table$" "" (match-string 1)))))
      (asm-goto-position addr)
      (asm-split)
      (beginning-of-line)
      (insert table "_" num)
      (if (string= label "") t
        (insert ";")
        (insert " ; ")
        (insert label)
        (set-column-width 68))
      (insert "\n")
      (previous-line)))
  (next-line))

(defvar sdh-indent-column 28 "current indentation for C-<TAB>")
(defun sdh-set-indent-column ()
  (interactive)
  (setq sdh-indent-column (current-column)))
(defun sdh-indent-to-column ()
  (interactive)
  (save-excursion
    (end-of-line)
    (back-to-indentation)
    (indent-to-column sdh-indent-column))
  (if (< (current-column) sdh-indent-column)
      (forward-char (- sdh-indent-column (current-column)))))
;(global-set-key (kbd "<C-tab>") 'sdh-indent-to-column)
;(global-set-key (kbd "<M-C-tab>") 'sdh-set-indent-column)
