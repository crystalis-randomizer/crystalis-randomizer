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
(global-set-key (kbd "C-c x") 'sdh-ensure-point-after-mark)

(defun sdh-highlight-region ()
  (interactive)
  (add-text-properties
   (region-beginning) (region-end) '(face font-lock-warning-face)))
(global-set-key (kbd "C-c 1 h") 'sdh-highlight-region)

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
(define-key asm-mode-map (kbd "C-c i d") 'sdh-insert-datatable-label)

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
   word-end)))

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
