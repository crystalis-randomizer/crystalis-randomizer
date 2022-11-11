(require 'asm-mode)

; Functions for dealing with 6502 assembly code

; TODO
;   - asm-join
;   - asm-data
;   - keybinding for asm-disasm
;   - words, tables
;   - labels (incl relative + and -)
;   - defines

; asm-disasm - if mark active then do all highlighted
;            - if mark inactive then do a single instruction at point
; need a quick convenient binding to (activate-mark)

(defun asm-split ()
  "Split a '.byte' directive at the given position. "
  (interactive)
  (let (pos bol addr colon byte isHex splitAddr)
    (if (not (asm/re/on-line asm/re/byte-line)) (error "Can only split .byte lines."))
    (cond
     ((looking-at "$") (re-search-forward "\\.byte "))
     ((looking-back "^") (re-search-forward "\\.byte "))
     ((looking-back "\\.byte[ \t]*") (beginning-of-line) (re-search-forward "\\.byte "))
     ((looking-at "\\.byte[ \t]*") (beginning-of-line) (re-search-forward "\\.byte "))
     (t
      (asm/find-break)
      (save-excursion
        ; look for the preceding comma
        (setq pos (asm/get-position))
        (re-search-backward ".byte ")
        (setq byte (point))
        (re-search-backward "[0-9a-fA-F]")
        (forward-char)
        (setq colon (point))
        (re-search-backward "[^0-9a-fA-F]")
        (forward-char)
        (setq addr (point))
        (beginning-of-line)
        (setq bol (point))
        (setq addr (- addr bol))
        (setq colon (- colon bol))
        (setq byte (- byte bol))
        (setq isHex (not (looking-at "[ \\t]*[0-9]")))
        (setq splitAddr (if isHex (format "%x" pos) (format "%d" pos)))
        (if (< (length splitAddr) (- colon addr))
            (setq splitAddr (concat (make-string (- colon addr (length splitAddr)) ?0)
                                    splitAddr)))
        (if isHex (setq splitAddr (concat "$" splitAddr))))
      ; Now splitAddr is "$0002c" matching previous line, point is at the comma
      (delete-char 1)
      (insert "\n"
              (make-string (- colon (length splitAddr)) ? )
              splitAddr
              (make-string (- byte colon) ? )
              ".byte ")))))

(defun asm-relativize-jump ()
  (interactive)
  ;; To pick an appropriate label, we need to (1) rule out all labels
  ;; defined between here and there, and (2) rule out any label defined
  ;; further, but referenced earlier. For (2), find-relative-callers
  ;; will return empty.
  (save-excursion
    (let ((count 1)
          start curr target target-pos dir name)
      (setq start (line-beginning-position))
      (setq curr (asm/get-position))
      (beginning-of-line)
      (re-search-forward (concat ":[ \t]+" asm/re/jump "[ \t]+\\$[0-9a-fA-F]\\{5\\}")
                         (line-end-position))
      (backward-char)
      (setq target (asm/parse-number))
      (setq target-pos (save-excursion (goto-char (asm/find-position target))
                                       (point-marker)))
      (setq dir (if (> target curr) ?+ ?-))
      (while (and (not name) (< count 5))
        (goto-char start)
        (let* ((candidate (make-string count dir))
               (next (asm/find-relative-target candidate))
               (refs (and next (progn (goto-char (asm/find-position next))
                                      (asm/find-relative-callers candidate))))
               (bad (and next (asm/ordered-p curr (- next 1) target))))
          (message "candidate %s defined at %x referenced at %s"
                     candidate (or next 0) (mapcar (lambda (x) (format "%x" x)) refs))
          (mapc (lambda (ref) (if (asm/ordered-p curr (- ref 1) target) (setq bad t)
                                (message "ref %x ok because not in (%x, %x)" ref curr target)
                                ))
                refs)
          (if (not bad)
              (setq name candidate)
            (message "rejecting %s" candidate)
            (setq count (+ 1 count)))))
      (message "name: %s" name)
      (if name
          (progn
            (goto-char target-pos)
            (beginning-of-line)
            (if (not (asm/re/on-line asm/re/inst-line)) (error "not yet disassembled target"))
            (re-search-forward "\\$")
            (backward-char)
            (if (not (looking-back (make-string (+ 1 (length name)) ?\s))) (error "not enough space on line"))
            (delete-backward-char (+ 1 (length name)))
            (beginning-of-line)
            (insert name " ")
            (goto-char start)
            (cond
             ((= dir ?+)
              (while (re-search-forward (format "%s[ \t]+\\$%05x" asm/re/jump target) target-pos t)
                (re-search-backward "\\$")
                (insert name " ; ")))
             ((= dir ?-)
              (end-of-line)
              (while (re-search-backward (format "%s[ \t]+\\$%05x" asm/re/jump target) target-pos t)
                (re-search-forward "\\$")
                (backward-char)
                (insert name " ; ")))))))))

; use (setq asm/org-delta #x8000), for example
(defvar asm/org-delta 0 "Difference to add when inserting an .org")
(defun asm/insert-org-before-label ()
  (interactive)
  (let (n)
    (save-excursion
      (re-search-forward "^ *\\$[0-9a-f]")
      (backward-char)
      (insert "0x")
      (setq n (number-at-point))
      (delete-backward-char 2))
    (save-excursion
      (beginning-of-line)
      (insert (format ".org $%04x\n" (+ n asm/org-delta))))))
(defun asm/replace-wordref ()
  (interactive)
  (let (a s e)
    (save-excursion
      (re-search-forward "; \\$[0-9a-f]")
      (setq a (word-at-point))
      (re-search-forward (format "^ *%s *" a))
      (beginning-of-line)
      (previous-line)
      (setq s (point))
      (search-forward ":")
      (backward-char)
      (setq e (point))
      (setq a (buffer-substring-no-properties s e)))
    (save-excursion
      (beginning-of-line)
      (search-forward "(")
      (kill-word 1)
      (insert a))))
(defun asm/next-label ()
  (interactive)
  (re-search-forward "^@?[A-Za-z0-9_]+:"))
(defun asm/next-full-addr ()
  (interactive)
  (re-search-forward " [a-z]\\{3\\} (?\\$[0-9a-f]\\{5\\}"))
(defun asm/address-at-point ()
  (interactive)
  (let (s e)
    (if (looking-at "[ ,\n]") (backward-char))
    (forward-word)
    (setq e (point))
    (backward-word)
    (forward-char)
    (setq s (point))
    (buffer-substring-no-properties s e)))
(defun asm-goto-address-at-point ()
  (interactive)
    (asm-goto-position (asm/address-at-point)))
(defun asm/best-label-for-address (a)
  (let ((narg (string-to-number a 16)) nactual l s e)
    (save-excursion
      (asm-goto-position a)
      (beginning-of-line)
      (previous-line)
      (while (or (looking-at " *;") (looking-at " *$"))
        (previous-line))
      (if (looking-at "@?[A-Za-z0-9_]+:")
          (progn (setq s (point))
                 (search-forward ":")
                 (backward-char)
                 (setq e (point))
                 (setq l (buffer-substring-no-properties s e)))
        (next-line)
        (insert "_" a ":\n")
        (setq l (format "_%s" a)))
      (re-search-forward "^ *\\$")
      (setq s (point))
      (search-forward " ")
      (setq e (- (point) 1))
      (setq nactual (string-to-number (buffer-substring-no-properties s e) 16))
      ;(message (format "label %s arg %x actual %x" l narg nactual))
      (if (= nactual narg) l
        (format "%s+%d" l (- narg nactual))))))

(defun asm/label-from-address-at-point ()
  (interactive)
  (asm/best-label-for-address (asm/address-at-point)))
(defun asm-replace-with-label ()
  (interactive)
  (let (s e (l (asm/label-from-address-at-point)))
    (if (looking-at "[ ,\n]") (backward-char))
    (forward-word)
    (setq e (point))
    (backward-word)
    (setq s (point))
    (delete-region s e)
    (insert l)))

(defconst asm/hex (lambda (x) (and x (format "%x" x))))

(defun asm/ordered-p (a b c)
  (or (and (< a b) (< b c)) (and (> a b) (> b c))))

(defun asm/get-relative-labels (start)
  "Returns a list of relative labels at the given position"
  (let (done c pos labels)
    (while (not done)
      (setq pos start)
      (setq c (char-after start))
      (while (and (or (= c ?+) (= c ?-)) (= c (char-after pos)))
        (setq pos (+ 1 pos)))
      (if (= pos start)
          (setq done t)
        (setq labels (cons (buffer-substring-no-properties start pos) labels))
        (while (or (= ?\s (char-after pos)) (= ?\t (char-after pos)))
          (setq pos (+ 1 pos)))
        (setq start pos)))
    labels))

(defconst asm/re/jump
  "\\(?:bcc\\|bcs\\|beq\\|bmi\\|bne\\|bpl\\|bvc\\|bvs\\|jmp\\|jsr\\)")

(defun asm/find-relative-callers (name)
  "Returns a list of positions of relative callers of the current
line if 'name' were defined there."
  (save-excursion
    (let ((start (point))
          (dir (aref name 0))
          (case-fold-search t)
          limit callers)
      (cond
       ((= dir ?-)
        (if (re-search-forward (concat "^\\(?:\\(?:[-+]+\\|@[^:]+:\\)[ \t]+\\)*"
                                       (regexp-quote name) "[ \t]+")
                               nil t)
            (setq limit (line-end-position))
          (setq limit (buffer-end 1)))
        (goto-char start)
        (while (re-search-forward (concat ":[ \t]+" asm/re/jump "[ \t]+"
                                          (regexp-quote name) "[ \n\t;]")
                                  limit t)
          (backward-char)
          (setq callers (cons (asm/get-position) callers))))
       ((= dir ?+)
        (setq search 're-search-backward)
        (setq limit (buffer-end -1))

        (if (re-search-backward (concat "^\\(?:\\(?:[-+]+\\|@[^:]+:\\)[ \t]+\\)*"
                                        (regexp-quote name) "[ \t]+")
                                nil t)
            (setq limit (line-beginning-position))
          (setq limit (buffer-end -1)))
        (goto-char start)
        (while (re-search-backward (concat ":[ \t]+" asm/re/jump "[ \t]+"
                                           (regexp-quote name) "[ \n\t;]")
                                   limit t)
          (setq callers (cons (asm/get-position) callers))))
       (t          (error "Bad relative name: %s" name)))
      callers)))


      ;; (cond
      ;;  ((string= "+" (substring name 0 1)) (setq dir 'previous-line))
      ;;  ((string= "-" (substring name 0 1)) (setq dir 'next-line))
      ;; (beginning-of-line)
      ;; (while (not done)
      ;;   (mapcar (lambda (l) (if (= l name) (setq done t)))
      ;;           (asm/get-relative-labels (point)))
      ;;   ;; Look for any jumps to + or -
      ;;   (if 
      ;;   (cond
      ;;    ((looking-at "\(?:[-+]*[ \t]+\)*


      ;;   ;; If this line defines a relative label with the name 'name' then
      ;;   ;; we are done, since any further callers refer to it, instead.
      ;;   (if (looking-at (concat "\\(?:[-+]*[ \t]+\\)" (regexp-quote name) "[ \t]+"))
      ;;       (setq done t))
      ;;   (if (looking-at (concat "[^\n]*:[ \t]*[ \t]+"
      ;;                           (regexp-quote name) "[^-+]"))
      ;;       (setq callers (cons (point) callers)))
      ;;   (apply dir '(1)))
      ;; callers)))
       
(defun asm/find-relative-target (name)
  "Returns the position of the relative target, or nil."
  (save-excursion
    (let ((dir (aref name 0))
          search)
      (cond
       ((= dir ?-) (end-of-line) (setq search 're-search-backward))
       ((= dir ?+) (setq search 're-search-forward))
       (t          (error "Bad relative name: %s" name)))
      (if (funcall search (concat "^\\(?:\\(?:[-+]+\\|@[^:]+:\\)[ \t]+\\)*"
                                  (regexp-quote name) "[ \t]")
                   nil t)
          (asm/get-position)))))

; Finding positions is hard...

(defun asm/find-position/line-addr (line)
  (goto-line line)
  (or (re-search-forward "^\\(?:[-+ \t]\\|@[^:]+: \\)+\\$[0-9a-fA-f]+" nil t)
      (progn (re-search-backward "^\\(?:[-+ \t]\\|@[^:]+: \\)+\\$[0-9a-fA-f]+")
             (re-search-forward  "^\\(?:[-+ \t]\\|@[^:]+: \\)+\\$[0-9a-fA-f]+")))
  (backward-char)
  (asm/parse-number))

(defun asm/find-position (addr)
  "Find the buffer position corresponding to the given address"
  ; Do a binary search on lines.
  (save-excursion
    (let ((start 0)
          (end (line-number-at-pos (buffer-end 1)))
          mid rest)
      (cond
       ((> (asm/find-position/line-addr start) addr) t) ; do nothing
       ((<= (asm/find-position/line-addr end) addr) (setq start end))
       (t
        ; Established good brackets, now search
        ; NOTE: this is super dumb, recomputing the function a lot
        ; more often than we really need.  We should be smarter.
        ; Maybe once we're on the same line, bail out to just count?
        (while (< (+ 1 start) end)
          (setq mid (/ (+ start end) 2))
          ;(message "start %d end %d mid %d" start end mid)
          (if (<= (asm/find-position/line-addr mid) addr)
              (setq start mid) ; mid < the point we're looking for - keep end
            (setq end mid)))))
      ;; TODO - find the byte within the line, if it's a bytes line.
      (setq rest (- addr (asm/find-position/line-addr start)))
      (goto-line start)
      ;(message "line %d rest %d" start rest)
      (cond
       ((and (> rest 0) (looking-at "^\\(?:[-+ \t]\\|@[^:]+: \\)+\\$[0-9a-fA-F]+[ \t]+\\.byte"))
        (re-search-forward "\\.byte")
        (while (> rest 0)
          (re-search-forward "," nil t)
          (setq rest (- rest 1)))
        (+ 1 (point)))
       ((and (> rest 0) (looking-at "^\\(?:[-+ \t]\\|@[^:]+: \\)+\\$[0-9a-fA-F]+[ \t]+\\.text"))
        (re-search-forward "\\.text[ \t]*\"")
        (+ rest (point)))
       (t (point))))))

(defun asm-goto-position (addr)
  "Go to the given position"
  (interactive "sAddress: ")
  (goto-char (asm/find-position (string-to-number addr 16))))


(defun asm-replace-address-at-point-with-label ()
  (interactive)
  (let (a s)
    (save-excursion
      (setq a (format "%x" (asm/parse-number)))
      (asm-goto-position a)
      (asm-split)
      (beginning-of-line)
      (previous-line)
      (if (looking-at "^[A-Za-z0-9_]+:")
          (progn
            (setq s (point))
            (search-forward ":")
            (setq a (buffer-substring-no-properties s (- (point) 1))))
        (setq a (format "_%s" a))
        (next-line)
        (insert (format "%s:\n" a))))
    (forward-char)
    (search-backward "$")
    (kill-word 1)
    (insert a)))

(defun asm-rename-label (new-name)
  (interactive "sNew name: ")
  (let (l s)
    (save-excursion
      (beginning-of-line)
      (setq s (point))
      (search-forward ":")
      (setq l (buffer-substring-no-properties s (- (point) 1)))
      (beginning-of-buffer)
      (replace-string l new-name))))

;; (defun asm/find-position (pos)
;;   "Find the buffer position the given address"
;;   ; Basically need to do a binary search...
;;   (let ((start 0)
;;         (end (buffer-end 1))
;;         mid mid-pos)
;;     ; Check the bracketing
;;     (cond
;;      ((>= (asm/get-position start) pos) start)
;;      ((< (asm/get-position end) pos) end)
;;      (t
;;       ; Established good brackets, now search
;;       ; NOTE: this is super dumb, recomputing the function a lot
;;       ; more often than we really need.  We should be smarter.
;;       ; Maybe once we're on the same line, bail out to just count?
;;       (while (< start end)
;;         (setq mid (/ (+ start end) 2))
;;         (setq mid-pos (asm/get-position mid))
;;         (if (< mid-pos pos)
;;             (setq start mid) ; mid < the point we're looking for - keep end
;;           (setq end mid)))
;;       start))))

;; (defun asm-goto-position (pos)
;;   "Go to the given position"
;;   (interactive "sPosition: ")
;;   (goto-char (asm/find-position (string-to-number pos 16))))

(defun asm-convert-address-to-label ()
  (interactive)
  ;; figure out what address it is
  (save-excursion
    (beginning-of-line)
    (if (not (asm/re/on-line asm/re/inst-line)) (error "must be on instruction line"))
    (re-search-forward (concat asm/re/jump "[ \t]+\\$") (line-end-position))
    (message "pos %d" (point))
    (let* ((dollar (point))
           (address (asm/parse-number))
           (label (asm/label-for-address address)))
      (if (not label) (error "No label found for %05x" address))
      (re-search-forward "[^0-9a-fA-F]")
      (backward-char)
      (delete-region (- dollar 1) (point))
      (insert label))))        

(defun asm-goto-position-at-point()
  (interactive)
  (goto-char (asm/find-position (asm/parse-number))))

(defun asm/label-for-address (addr)
  (save-excursion
    (goto-char (asm/find-position addr))
    (beginning-of-line)
    (if (not (asm/re/on-line asm/re/inst-line)) nil
      (let (found bol)
        (while (not found)
          (previous-line)
          (cond
           ((asm/re/on-line asm/re/label-line)
            (setq bol (line-beginning-position))
            (re-search-forward "[^a-zA-Z0-9_]")
            (setq found (buffer-substring-no-properties bol (- (point) 1))))
           ((not (asm/re/on-line asm/re/comment-line))
            (setq found 'none))))
        (if (eq found 'none) nil found)))))

; Joining is hard because what do we do with comments?

(defun asm-join ()
  "Join two lines into a single '.byte' directive.
If the resulting line is longer than 16 byte, re-split it at 16. If we run into
a comment then just bail out."
  (interactive)
  (if (looking-at "\n") (forward-char))
  (if (save-excursion
        (backward-word) (backward-char)
        (looking-at "\\.byte"))
      (progn (backward-word) (backward-char)))
  (if (save-excursion
        (backward-word) (looking-at "\\$[0-9a-fA-F]*[ \t]*\\.byte"))
      (backward-word))
  (if (looking-back "^\\(?:[-+ \t]\\|@[^:]+:\\)*") (beginning-of-line))
  (cond
   ((not (looking-back "\\(?:[$ ,][0-9a-fA-F][0-9a-fA-F]\\|\"\\)\n"))
    (error "Not immediately after a .byte block"))
   ((not (re-search-forward "^\\(?:[-+ \t]\\|@[^:]+:\\)*\\$[0-9a-fA-F]*[ \t]+\\.byte[ \t]+" nil t))
    (error "Not immediately before a .byte block"))
   (t
    (delete-region (- (line-beginning-position) 1) (point))
    (insert ",")))
  (save-excursion
    ; check if the line is too long
    (beginning-of-line)
    (if (re-search-forward
         "\\.byte[ \t]+\\(\\$?[0-9a-fA-F]+[ \t]*,[ \t]*\\)\\{16\\}" nil t)
        (asm-split))))      

(defun asm-format-data-table (start end)
  "Format a data table as .word (addr) elements"
  (interactive "r")
  (if mark-active
      (asm/format-data-table-region start end)
    (asm/format-data-table-one)))

(defun asm/format-data-table-region (start end)
  ;; (save-excursion
  ;;   (goto-char start)
  ;;   ;; forward two bytes, then get-bytes...
  )

(defun asm/format-data-table-one (start end)
  )

;; (defun asm-convert-to-word () ; (start end)
;;   "Convert the region (or next pair of bytes if mark not active) to a .word"
;;   (interactive)
;;   ;; TODO - clean this up a lot
;;   (let (m s)
;;     (re-search-forward ".byte[^,]*,[^,]*\\(?:,\\|\n\\)")
;;     (if (looking-back ",") (asm-split) (backward-char))
;;     (beginning-of-line)
;;     (re-search-backward ".byte")
;;     (setq m (point))
;;     (re-search-forward "\\$")
;;     (delete-region m (point))
;;     (insert ".word (")
;;     (setq m (point))
;;     (re-search-forward ",")
;;     (backward-char)
;;     (delete-char 1)
;;     (setq s (buffer-substring-no-properties m (point)))
;;     (delete-region m (point))
;;     (end-of-line)
;;     (insert s)
;;     (insert ")")))


(defun asm-disassemble (start end)
  "Disassemble data into code"
  (interactive "r")
  (if mark-active
      (asm/disassemble-region start end)
    (asm/disassemble-one)))

(defvar asm/bytes-width 16 "Number of bytes to output on a line.") 

(defun asm-convert-to-bytes (prefix start end)
  "Convert to .byte lines"
  ;; TODO - add an option to actually assemble, rather than just reuse stored bytes
  (interactive "P\nr")
  (let* ((x asm/bytes-width) ; weird hack to make a local copy of the outer var
         (asm/bytes-width x))
    (if prefix
        (setq asm/bytes-width (prefix-numeric-value prefix)))
    (if mark-active
        (asm/convert-to-bytes-region start end)
      (asm/convert-to-bytes-one))))

(defun asm-convert-to-text (start end)
  "Convert to .byte lines with strings embedded"
  ;; TODO - consider adding a "one" version for non-active marks?
  (interactive "r")
  (asm/convert-to-text-region start end))

(defun asm-convert-to-word (start end)
  "Convert to .word lines"
  ;; TODO - add an option to actually assemble, rather than just reuse stored bytes
  (interactive "r")
  (if mark-active
      (asm/convert-to-words-region start end)
    (asm/convert-to-words-one)))

;(defun asm/assemble ())

(defun asm/disassemble-one ()
  (let* ((pos   (asm/get-position))
         (start (point))
         (bytes (asm/get-number-of-bytes 1))
         (inst  (aref asm/opcodes (car bytes)))
         (mode  (and inst (assoc (cdr inst) asm/addrmodes)))
         (len   (and mode (cadr mode)))
         extra)
    (if len
        (progn
          ;; check if we need more bytes
          (if (< (length bytes) len)
              (setq bytes
                    (append bytes (asm/get-number-of-bytes (- len (length bytes))))))
          ;; check if we have too many bytes
          (if (< (length bytes) len)
              (progn
                (setq extra (asm/seq-drop bytes len))
                (setq bytes (asm/seq-take bytes len))))
          ;; now bytes is just right, pass it through insert-disasm
          (asm/delete-range start (point))
          (asm/insert-disasm bytes pos)
          (if extra
              (asm/insert-bytes extra (+ pos len)))))))

(defun asm/convert-to-bytes-one ()
  (let* ((pos   (asm/get-position))
         (start (point))
         (bytes (asm/get-number-of-bytes 1)))
    (asm/delete-range start (point))
    (asm/insert-bytes bytes pos)))

(defun asm/convert-to-bytes-region (start end)
  (save-excursion
    (goto-char start)
    (let* ((pos   (asm/get-position))
           (bytes (asm/get-bytes-until end)))
      (asm/delete-range start end)
      (asm/insert-bytes bytes pos))))

;; (defun asm-convert-to-bytes-width (start end width)
;;   (interactive "r
;; nBytes per line: ")
;;   (let ((asm/bytes-width width))
;;     (asm-convert-to-bytes start end)))

(defun asm/insert-bytes (bytes &optional pos)
  "Inserts a .byte directive (or more, if many arguments)."
  (while bytes
    (let ((extra (asm/seq-drop bytes asm/bytes-width)))
      (setq bytes (asm/seq-take bytes asm/bytes-width))
      (insert (if pos (format "        $%05x              " pos) "  ")
              ".byte "
              (mapconcat (lambda (x) (format "$%02x" x)) bytes ",")
              "\n")
      (if pos (setq pos (+ pos (length bytes))))
      (setq bytes extra))))

;; (defvar asm/text-escaped "\"#%&'()*+/<=>[\\]^`{|}"
;;   ;; TODO - was originally just \"\\, but these are also not super helpful
;;   ;; (string-match-p (regexp-quote (format "%c" byte)) asm/text-escaped)
;;   "Characters that are escaped rather than inserted into text.")

;; TODO - track line size, wrap at fixed number, or after a zero? predicate on byte & length?
(defun asm/insert-text (bytes &optional pos break)
  "Inserts a single .byte directive with printable chars as strings."
  (if (null break) (setq break (lambda (c w) nil)))
  (let ((quot nil)
        (comma "")
        start byte)
    (while bytes
      (setq byte (car bytes))
      (setq bytes (cdr bytes))
      (if (string= comma "")
          (progn
            (insert (if pos (format "        $%05x              " pos) "  ") ".byte ")
            (setq start (point))))
      (if (or (>= byte #x7f) (< byte #x20)
              (= byte ?*) (= byte ?+) (= byte ?/)
              (= byte ?<) (= byte ?=) (= byte ?>)
              (= byte ?\[) (= byte ?\]) (= byte ?^)
              (= byte ?{) (= byte ?|) (= byte ?}) (= byte ?~)
              (= byte ?\") (= byte ?\\))
          (progn
            ;; Should be unquoted
            (if quot (insert "\""))
            (setq quot nil)
            (insert (format "%s$%02x" comma byte)))
        ;; Should be quoted
        (if (not quot) (insert comma "\""))
        (setq quot t)
        (insert byte))
      ;; See if we should break the line here
      (if (and (not quot) (apply break (list byte (- (point) start))))
          (progn
            (setq comma "")
            (insert "\n"))
        (setq comma ",")))
    ;; Add final line break
    (if quot (insert "\""))
    (if (string= comma ",")
        (insert "\n"))))

;; get-bytes-until ???
;; (defun asm/convert-to-text-one ()
;;   (let* ((pos   (asm/get-position))
;;          (start (point))
;;          (bytes (asm/get-number-of-bytes 1))
;;          (inst  (aref asm/opcodes (car bytes)))
;;          (mode  (and inst (assoc (cdr inst) asm/addrmodes)))
;;          (len   (and mode (cadr mode)))
;;          extra)
;;     (if len
;;         (progn
;;           ;; check if we need more bytes
;;           (if (< (length bytes) len)
;;               (setq bytes
;;                     (append bytes (asm/get-number-of-bytes (- len (length bytes))))))
;;           ;; check if we have too many bytes
;;           (if (< (length bytes) len)
;;               (progn
;;                 (setq extra (asm/seq-drop bytes len))
;;                 (setq bytes (asm/seq-take bytes len))))
;;           ;; now bytes is just right, pass it through insert-disasm
;;           (asm/delete-range start (point))
;;           (asm/insert-disasm bytes pos)
;;           (if extra
;;               (asm/insert-bytes extra (+ pos len)))))))

(defun asm/convert-to-text-region (start end)
  (save-excursion
    (goto-char start)
    (let* ((pos   (asm/get-position))
           (bytes (asm/get-bytes-until end)))
      (asm/delete-range start end)
      (asm/insert-text bytes pos)))) ; (lambda (c w) (> w 50))))))
;; TODO - use prefix argument to set width or something?

;; (defun asm/insert-text (bytes &optional pos)
;;   "Inserts .byte directives with printable chars as strings."
;;   (let (word)
;;     (while bytes
;;       (setq word (asm/seq-take-while (lambda (x) (not (= 0 x))) bytes))
;;       (if (< (length word) (length bytes))
;;           (progn
;;             ;; Found a delimiter
;;             (setq bytes (asm/seq-drop bytes (+ 1 (length word))))
;;             (insert (if pos (format "        $%05x              " pos) "  ")
;;                     ".text \"")
;;             (if pos (setq pos (+ pos 1 (length word))))
;;             (mapcar (lambda (x) (insert x)) word)
;;             (insert "\"\n"))
;;         ;; No delimiter
;;         (asm/insert-bytes bytes pos)
;;         (setq bytes nil)))))

(defun asm/convert-to-words-one ()
  (let* ((pos   (asm/get-position))
         (start (point))
         (bytes (asm/get-number-of-bytes 2)))
    (asm/delete-range start (point))
    (asm/insert-words bytes pos)))

(defun asm/convert-to-words-region (start end)
  (save-excursion
    (goto-char start)
    (let* ((pos   (asm/get-position))
           (bytes (asm/get-bytes-until end)))
      (asm/delete-range start end)
      (asm/insert-words bytes pos))))

(defun asm/insert-words (bytes &optional pos)
  "Inserts .word directive(s)."
  (while (>= (length bytes) 2)
      (insert (if pos (format "        $%05x              " pos) "  ")
              (format ".word ($%02x%02x)" (cadr bytes) (car bytes))
              "\n")
    (setq bytes (cddr bytes))
    (if pos (setq pos (+ pos 2))))
  (if bytes (asm/insert-bytes bytes pos)))

(defun asm/insert-disasm (bytes &optional pos)
  "Inserts the results of disassembling the list of bytes into the buffer."
  ;; TODO - read stackindent from the previous line if it's a codeline
  (let ((stackindent ""))
    (while bytes
      (let* ((inst     (aref asm/opcodes (car bytes)))
             (mnemonic (and inst (car inst)))
             (mode     (and inst (assoc (cdr inst) asm/addrmodes)))
             (len      (if mode (cadr mode) 1))
             (fmt      (and mode (cddr mode)))
             (argbytes (asm/read-bytes (- len 1) (cdr bytes)))
             (rest     (asm/seq-drop bytes len)))
        (if (null argbytes) (setq inst nil))
        (insert
         (if pos (format "        $%05x%-14s"
                         pos
                         (if inst
                             (concat "  "
                                     (mapconcat (lambda (x) (format "%02x" x))
                                                (asm/seq-take bytes len)
                                                " ")
                                     ":")
                           ""))
           "  "))
        (if (not inst)
            ; no instruction, just insert .bytes
            (insert ".byte "
                    (mapconcat (lambda (x) (format "$%02x" x))
                               (asm/seq-take bytes len)
                               ",")
                    "\n")
          ; insert the mnemonic an argument
          (if (and (or (eq mnemonic 'pla) (eq mnemonic 'plp))
                   (> (length stackindent) 0))
              (setq stackindent (substring stackindent 1)))
          (insert stackindent
                  (symbol-name mnemonic)
                  (funcall fmt argbytes pos)
                  "\n")
          (if (or (eq mnemonic 'pha) (eq mnemonic 'php))
              (setq stackindent (concat stackindent " ")))
          (if (or (eq mnemonic 'jmp) (eq mnemonic 'rts) (eq mnemonic 'rti))
              (progn
                (insert ";;; --------------------------------\n")
                (setq stackindent ""))))
	(setq pos (+ pos len))
        (setq bytes rest)))))

;;;;;;;;;;


(defun asm/disassemble-region (start end)
  (let (pos bytes)
    (save-excursion
      ;; (goto-char end)
      ;; (if (or (looking-at ",") (looking-back ",")) 
      ;;     (progn (asm-split)
      ;;            (beginning-of-line)
      ;;            (setq end (point-marker))))
      ; start by finding the address, then loop
      (goto-char start)
      ;; (if (or (looking-at ",") (looking-back ","))
      ;;     (progn (asm-split)
      ;;            (beginning-of-line)
      ;;            (setq start (point-marker))))
      (setq pos (asm/get-position))
      ; get all the bytes into a list
      ;(re-search-forward "\.byte")
      (setq bytes (asm/get-bytes-until end)))
    (goto-char start)
    (asm/delete-range start end)
    (asm/insert-disasm bytes pos)))

; TODO - could make address optional, but we kind of rely on it right now
; Likewise, would be nice to parse the mnemonic and address modes/args, but
; labels and defines make this much more difficult.
(defconst asm/re/byte-value
  (mapconcat 'identity
             '("\\(?:\\$[0-9a-fA-F]\\{2\\}" ; hex value
               "%[01]\\{1,8\\}" ; binary value
               "[1-9][0-9]*" ; decimal value
               "0[0-7]*" ; octal value
               "[a-zA-Z_][a-zA-Z0-9_]*" ; symbol name
               "\"[^\"]+\"\\)") ; ascii value
             "\\|"))
(defconst asm/re/address
  "^\\(?:[-+ \t]\\|@[^:]+: \\)+\\$[0-9a-fA-F]+")
(defun asm/re/addr-line (re)
  (concat asm/re/address re "\\(?:[ \t]\\|@[^:]+: \\)*\\(?:;.*\\)?$"))
(defconst asm/re/label-line
  "^@?[A-Za-z_][A-Za-z_0-9]+[ \t]*:?[ \t]*\\(?:;.*\\)?$")
(defconst asm/re/comment-line
  "^[ \t]*\\(?:;.*\\)?$")
(defconst asm/re/byte-line
  (asm/re/addr-line (concat "[ \t]*\\.byte[ \t]+\\("
                            asm/re/byte-value
                            "\\(?:[ \t]*,[ \t]*"
                            asm/re/byte-value
                            "\\)*\\)")))
(defconst asm/re/word-line
  (asm/re/addr-line
   "[ \t]*\\.word[ \t]+(\\(\\$?[0-9a-fA-F]+\\|[A-Za-z_][A-Za-z_0-9]*\\))"))
(defconst asm/re/inst-line
  (asm/re/addr-line (concat
                     "\\(\\(?:[ \t]+[0-9A-Fa-f ]\\{2\\}\\)*\\):?" ; bytecode in \1
                     "[ \t]*" ; space
                     "\\([a-zA-Z]\\{3\\}\\)" ; mnemonic in \2
                     "[ \t]*" ; space before arg
                     "\\([^;\n]*\\)" ; optional argument in \3, may have label refs
                     )))
(defun asm/re/no-dollar (str)
  (let ((l (- (length str) 1)))
    (if (string= (substring str l) "?")
        (substring str 0 l)
      str)))

(defun asm/re/on-line (re)
  (save-excursion (beginning-of-line) (re-search-forward re (line-end-position) t)))

;;;;;  TODO --- use these new REs as the basis of the various things
;;;;;       --- TODO - add label support for .word lines - will need to
;;;;;                  parse bank comments to know how to translate to 16bit tho!

(defun asm/get-bytes-until (end)
  "Return a list of integers corresponding to the byte values in the range.
Destroys point, and ignores address labels."
  (let (bytes done (start (point)))
    (while (and (< (point) end) (not done))
      (cond
       ;; Labels and comments are irrelevant, so skip them
       ((asm/re/on-line asm/re/comment-line) (next-line))
       ((asm/re/on-line asm/re/label-line) (next-line))
       ;; .byte lines need some actual handling
       ((asm/re/on-line asm/re/byte-line)
        ;; It matters if start or end is in the middle of the line.
        (re-search-forward "\\.byte" (min (line-end-position) end) t) ; skip past addr, don't want to match it
        (setq bytes (append bytes (asm/bytes-from-line (point) (min (line-end-position) end))))
        (end-of-line)
        (forward-char))
       ;; .word lines are a little easier, with helepr functions.
       ((asm/re/on-line asm/re/word-line)
        ;; It's possible that most of the match was after 'end' - check again
        ;; without the dollar but with 'end' just to be sure.
        (beginning-of-line)
        (if (re-search-forward (asm/re/no-dollar asm/re/word-line) end t)
            (setq bytes (append bytes (asm/bytes-from-word (match-string 1))))
          (setq done t))
        (forward-char))
       ;; instruction lines are trivial if we don't care to actually parse them
       ((asm/re/on-line asm/re/inst-line)
        (beginning-of-line)
        (if (re-search-forward (asm/re/no-dollar asm/re/inst-line) end t)
            (setq bytes (append bytes (mapcar (lambda (x) (string-to-number x 16))
                                              (split-string
                                               (substring-no-properties
                                                (match-string 1))
                                               " " t))))
          (setq done t))
        (forward-char))
       (t (error "Could not parse line: %s"
                 (buffer-substring-no-properties (line-beginning-position)
                                                 (line-end-position)))))
      (if (<= (point) start) (error "point did not advance"))
      (setq start (point))
  )
    bytes))

; TODO - handle text correctly...
; TODO - asm/get-bytes, asm/insert-disasm       
(defun asm/get-number-of-bytes (count)
  "Return a list of integers corresponding to the byte values in the range.
Leaves point at end. Ignores address labels. The returned list may contain
extra elements if an instruction, .byte, or .word needed to be broken up."
  (let ((bytes nil) inst)
    (while (> count 0)
      (cond
       ;; Labels and comments are skipped
       ((asm/re/on-line asm/re/comment-line) (next-line))
       ((asm/re/on-line asm/re/label-line) (next-line))
       ;; .byte lines need some actual handling
       ((asm/re/on-line asm/re/byte-line)
        ;; It matters if point is in the middle of the line.
        ;; Note: we do this one at a time, we could be more sophisticated, but
        ;; we'd need to pay close attention to how many byte are left that we need.
        (re-search-forward "\\.byte" (line-end-position) t) ; skip past addr
        (if (re-search-forward "[0-9a-fA-F\\$]" (line-end-position) t)
            (progn
              (setq bytes (append bytes (list (asm/parse-number))))
              (setq count (- count 1))
              (or (re-search-forward "," (line-end-position) t) (end-of-line)))
          (end-of-line) (forward-char)))
       ;; .word lines are a little easier, with helepr functions.
       ((asm/re/on-line asm/re/word-line)
        ;; It's possible that most of the match was after 'end' - check again
        ;; without the dollar but with 'end' just to be sure.
        (beginning-of-line)
        (re-search-forward asm/re/word-line)
        (setq bytes (append bytes (asm/bytes-from-word (match-string 1))))
        (setq count (- count 2))
        (forward-char))
       ;; instruction lines are trivial if we don't care to actually parse them
       ((asm/re/on-line asm/re/inst-line)
        (beginning-of-line)
        (re-search-forward asm/re/inst-line)
        (setq inst (mapcar (lambda (x) (string-to-number x 16))
                           (split-string (substring-no-properties (match-string 1))
                                         " " t)))
        (setq bytes (append bytes inst))
        (setq count (- count (length inst)))
        (forward-char))
       (t (error "Could not parse line: %s"
                 (buffer-substring-no-properties (line-beginning-position)
                                                 (line-end-position))))))
    bytes))




  ;; (if (re-search-forward "\\.byte[ \\t]*\\([0-9a-fA-F\\$,]+\\)" end t)
  ;;     (let ((line (asm/bytes-from-line (match-string 1))))
  ;;       (append line (asm/get-bytes end)))
  ;;   nil))

(defun asm/bytes-from-word (str)
  "Returns a list of bytes from a 16-bit word, little-endian."
  (let (result rom ram)
    (cond
     ((string-match "^[A-Za-z_][A-Za-z0-9_]*$" str)
      ;; Look for a label
      (save-excursion
        (beginning-of-buffer)
        (or (re-search-forward (concat "^" str "\\b") nil t)
            (error "Could not find label '%s'" str))
        (re-search-forward asm/re/address)
        (backward-char)
        (setq result (asm/parse-number))
        (re-search-backward "@@ \\$[0-9a-fA-F]+")
        (forward-char 4)
        (setq ram (asm/parse-number))
        (re-search-forward asm/re/address)
        (backward-char)
        (setq rom (asm/parse-number))
        (message "result %x rom %x ram %x" result rom ram)
        (setq result (+ ram (- result rom)))))
     ((string-match "^\\$[0-9a-fA-F]+$" str)
      (setq result (string-to-number (substring str 1) 16)))
     (t (error "Bad argument to .word: '%s'" str)))
    (if (> result #xffff)
        (error "Argument to .word may only be 16 bits: %x" result))
    (list (logand #xff result) (lsh result -8))))

(defun asm/bytes-from-line (start end)
  "Returns a list of numbers from a comma-separated line."
  (let (quot bytes)
    (save-excursion
      (goto-char start)
      (beginning-of-line)
      (re-search-forward "\\.byte") ; TODO - consider handling .word as well?
      (while (< (point) end)
        (cond
         ((looking-at "\"")
          (setq quot (not quot)) (forward-char))
         (quot
          (setq bytes (append bytes (list (char-after (point))))) (forward-char))
         ((looking-at "[ \t,]")
          (forward-char))
         ((looking-at "\\$[0-9a-fA-F]\\{2\\}\\b")
          (setq bytes (append bytes (list (asm/parse-number))))
          (forward-char 3))
         ;; TODO - supper other kinds of numbers?!?
         ((looking-at ";")
          (re-search-forward "\n"))
         (t
          (error "Bad pattern")))))
    bytes))

;; (defun asm/bytes-from-line (str)
;;   "Returns a list of numbers from a comma-separated line."
;;   (message (format "reading bytes from '%s'" str))
;;   (mapcar (lambda (x)
;;             (if (string= "$" (substring x 0 1))
;;                 (string-to-number (substring x 1) 16)
;;               (string-to-number x 10)))
;;           (split-string str "," t))) ; "[ \\t]*"  emacs 24 added trim arg

(defun asm/delete-range (start end)
  "Deletes a range from the buffer, handles lines and intra-line boundaries.
Point will be left at the deleted spot. If 'start' or 'end' is in the middle
of a non-divisible line, then the entire line will be deleted."
  ;; handle end marker, ensure it's after the \n of the last line
  (goto-char end)
  (if (looking-back "^") (backward-char))
  (if (looking-back ",") (backward-char))
  (if (asm/re/on-line asm/re/byte-line)
      (progn
        ;; .byte lines are potentially divisible - figure out where we are on it
        (re-search-forward ",\\|\\.byte\\|$" (line-end-position) t)
        (cond
         ((looking-back ",") (asm-split) (previous-line))
         ((looking-back "\\.byte") (previous-line)))))
  (end-of-line)
  (forward-char)
  (setq end (point-marker))
  ;; handle start marker, ensure it's the start of the first line to delete
  (goto-char start)
  (if (looking-at "$") (next-char)) ; treat last char of line as next line
  (if (asm/re/on-line asm/re/byte-line)
      (progn
        ;; .byte lines are potentially divisible - figure out where we are on it
        (re-search-backward ",\\|\\.byte" (line-beginning-position) t)
        (if (looking-at ",") (asm-split))))
  (beginning-of-line)
  (setq start (point-marker))
  (delete-region start end)
  (goto-char start))

(defun asm/insert-disasm (bytes &optional pos)
  "Inserts the results of disassembling the list of bytes into the buffer."
  (let ((stackindent ""))
    (while (not (null bytes))
      (let* ((inst     (aref asm/opcodes (car bytes)))
             (mnemonic (and inst (car inst)))
             (mode     (and inst (assoc (cdr inst) asm/addrmodes)))
             (len      (if mode (cadr mode) 1))
             (fmt      (and mode (cddr mode)))
             (argbytes (asm/read-bytes (- len 1) (cdr bytes)))
             (rest     (asm/seq-drop bytes len)))
        (if (null argbytes) (setq inst nil))
        (insert
         (if pos (format "        $%05x%-14s"
                         pos
                         (if inst
                             (concat "  "
                                     (mapconcat (lambda (x) (format "%02x" x))
                                                (asm/seq-take bytes len)
                                                " ")
                                     ":")
                           ""))
           "  "))
        (if (not inst)
            ; no instruction, just insert .bytes
            (insert ".byte "
                    (mapconcat (lambda (x) (format "$%02x" x))
                               (asm/seq-take bytes len)
                               ",")
                    "\n")
          ; insert the mnemonic an argument
          (if (and (or (eq mnemonic 'pla) (eq mnemonic 'plp))
                   (> (length stackindent) 0))
              (setq stackindent (substring stackindent 1)))
          (insert stackindent
                  (symbol-name mnemonic)
                  (funcall fmt argbytes pos)
                  "\n")
          (if (or (eq mnemonic 'pha) (eq mnemonic 'php))
              (setq stackindent (concat stackindent " ")))
          (if (or (eq mnemonic 'jmp) (eq mnemonic 'rts) (eq mnemonic 'rti))
              (progn
                (insert ";;; --------------------------------\n")
                (setq stackindent ""))))
	(setq pos (+ pos len))
        (setq bytes rest)))))

(defun asm/seq-drop (list num)
  (cond
   ((= 0 num) list)
   ((null list) nil)
   (t (asm/seq-drop (cdr list) (- num 1)))))

(defun asm/seq-take (list num)
  (cond
   ((= 0 num) nil)
   ((null list) nil)
   (t (cons (car list) (asm/seq-take (cdr list) (- num 1))))))

(defun asm/seq-take-while (pred list)
  (cond
   ((null list) nil)
   ((apply pred (list (car list))) (cons (car list) (asm/seq-take-while pred (cdr list))))
   (t nil)))

(defun asm/read-bytes (num list)
  (cond
   ((= 0 num) 0)
   ((null list) nil)
   (t (let ((hi (asm/read-bytes (- num 1) (cdr list))))
        (and hi (+ (lsh hi 8) (car list)))))))

(defun asm/drop (num list)
  (if (= 0 num) list (asm/drop (- num 1) (cdr list))))    

(defun asm/get-position (&optional pos)
  "Returns the byte position at the cursor."
  (let (commas base)
    (save-excursion
      (if pos (goto-char pos))
      (setq commas (asm/count-offset))
      (end-of-line)
      (re-search-backward "^[ \t]*\\(?:\\(?:[-+]+\\|@[^:]+:\\)[ \t]+\\)*\\$\\([0-9a-fA-F]+\\)")
      (setq base (string-to-number (substring-no-properties (match-string 1)) 16))
      (+ base commas))))

(defun asm/parse-number ()
  "Reads the current number."
  (save-excursion
; if not looking-at a hex digit but looking-back at it, tthen backwerd-char
    (let (radix p1 p2)
      (if (looking-at "\\$") (forward-char))
      (re-search-forward "[^0-9a-fA-F]")
      (backward-char)
      (setq p2 (point))
      (re-search-backward "[^0-9a-fA-F]")
      (setq p1 (+ 1 (point)))
      (setq radix (if (looking-at "\\$") 16 10))
      (string-to-number (buffer-substring-no-properties p1 p2) radix))))

(defun asm-add-to-number (arg)
  (interactive "nAdd: ")
  (save-excursion
; if not looking-at a hex digit but looking-back at it, tthen backwerd-char
    (let (radix p1 p2 num fmt)
      (if (looking-at "\\$") (forward-char))
      (re-search-forward "[^0-9a-fA-F]")
      (backward-char)
      (setq p2 (point))
      (re-search-backward "[^0-9a-fA-F]")
      (setq p1 (+ 1 (point)))
      (setq radix (if (looking-at "\\$") 16 10))
      (setq num (string-to-number (buffer-substring-no-properties p1 p2) radix))
      (goto-char p1)
      (delete-region p1 p2)
      (if (= radix 16)
          (setq fmt (format "%%0%dx" (- p2 p1 -1)))
        (setq fmt (format "%%0%dd" (- p2 p1))))
      (insert (format fmt (+ num arg))))))

(defun asm/count-offset ()
  "Determine the offset of point within its line."
  (if (not (asm/re/on-line asm/re/byte-line))
      0
    (let ((p (point))
          (q nil)
          (o 0))
      (save-excursion
        (beginning-of-line)
        (re-search-forward "\\.byte")
        (while (< (point) p)
         (cond
          ((looking-at "\"")
           (setq q (not q)) (forward-char))
          (q
           (setq o (+ 1 o)) (forward-char))
          ((looking-at "[ \t,]")
           (forward-char))
          ((re-search-forward asm/re/byte-value nil t)
           (if (<= (point) p) (setq o (+ 1 o))))
          (t
           (error "Bad pattern"))))
        o))))

;; (defun asm/count-offset (regexp)
;;   "Walk backwards until we find the .byte directive, counting commas"
;;   (cond
;;    ((looking-at ",") (backward-char) (+ 1 (asm/count-offset regexp)))
;;    ((looking-at regexp) 0)
;;    ((looking-at "^") (error "Could not find pattern"))
;;    (t (backward-char) (asm/count-offset regexp))))


(defun asm/find-break ()
  "Walk backwards until we find a comma. Error at the start of the line"
  (cond
   ((looking-at ","))
   ((looking-at "^") (error "Could not find place to break"))
   (t (progn (backward-char) (asm/find-break)))))

(defun asm/count-bits (arg)
  "Returns the number of bits set in the argument"
  (let ((bits 0))
    (while (> arg 0)
      (if (> (logand arg 1) 0) (setq bits (+ 1 bits)))
      (setq arg (lsh arg -1)))
    bits))

(defun asm-insert-break (arg) 
  (interactive "p")
  (save-excursion
    (beginning-of-line)
    (insert (if (> arg 1) "        " ";") ";; --------------------------------\n")))

;;; TODO - integrate with labels, too.
(defun asm-cycle-define ()
  "Cycle the value at point between a literal and a defined value."
  (interactive)
  (save-excursion
    (let (end arg)
      ;; First find the symbol at point.
      (beginning-of-line)
      (setq end (line-end-position))
      (if (re-search-forward ";" end t) (backward-char) (end-of-line))
      (while (cond
              ((looking-back "[ \t)]") (backward-char) t)
              ((looking-back ",[xy]") (backward-char 2) t)
              ((looking-back "\\+\\$?[0-9a-fA-F]+") (re-search-backward "\\+"))))
      ;; We should now be at the end of the numeric argument, if there is one.
      (setq end (point))
      (re-search-backward "[^0-9a-zA-Z_$]")
      (forward-char)
      ;; This is the start of the numeric argument.
      (setq arg (buffer-substring-no-properties (point) end))
      ;; Is it a name or a number?
      (save-excursion
        (beginning-of-buffer)

        (if (not (string-match "^\\$[0-9a-fA-F]\\{2,4\\}$" arg))
            ;; 'arg' is currently a name - find it and replace 'arg' with the value
            (progn
              (re-search-forward (concat "^define[ \t]+" arg "[ \t]+\\(\\$[0-9a-f]\\{2,4\\}\\)\\b"))
              (setq arg (match-string 1))))
        ;; Find the next define of 'arg'
        (if (re-search-forward (concat "^define[ \t]+\\([A-Za-z0-9_]+\\)[ \t]+\\" arg "\\b") nil t)
            (setq arg (match-string 1))))
      ;; Replace the argument with 'arg'
      (delete-char (- end (point)))
      (insert arg))))

;;;;;
; Disassembly table for 6502

(defconst asm/mnemonics
  '(adc and asl bcc bcs beq bit bmi
    bne bpl brk bvc bvs clc cld cli
    clv cmp cpx cpy dec dex dey eor
    inc inx iny jmp jsr lda ldx ldy
    lsr nop ora pha php pla plp rol
    ror rti rts sbc sec sed sei sta
    stx sty tax tay tsx txa txs tya))

(defconst asm/addrmodes
  `((,'ZeroPage 2 . (lambda (x a) (format " $%02x" x)))
    (,'Relative 2 . (lambda (x a)
                      (let ((o (if (> x 127) -254 2)))
                        (format " $%05x" (+ a x o)))))
    (,'Implied 1 . (lambda (x a) ""))
    (,'Absolute 3 . (lambda (x a) (format " $%04x" x)))
    (,'Accumulator 1 . (lambda (x a) ""))
    (,'Immediate 2 . (lambda (x a) (format " #$%02x" x)))
    (,'ZeroPageX 2 . (lambda (x a) (format " $%02x,x" x)))
    (,'ZeroPageY 2 . (lambda (x a) (format " $%02x,y" x)))
    (,'AbsoluteX 3 . (lambda (x a) (format " $%04x,x" x)))
    (,'AbsoluteY 3 . (lambda (x a) (format " $%04x,y" x)))
    (,'PreindexedIndirect 2 . (lambda (x a) (format " ($%02x,x)" x)))
    (,'PostindexedIndirect 2 . (lambda (x a) (format " ($%02x),y" x)))
    (,'IndirectAbsolute 3 . (lambda (x a) (format " ($%04x)" x)))))
    
; initialize opcodes

; (funcall (caddr (assoc 'Relative asm/addrmodes)) 5 25)

(defun asm/build-array (size data)
  "Build an array.  Data is a list of cons cells"
  (let ((a (make-vector size nil)))
    (mapcar
     (lambda (x)
       (if (aref a (car x)) (error "already defined: %d" (car x)))
       (aset a (car x) (cdr x)))
     data)
    a))

(defconst asm/opcodes
  (asm/build-array 256 '(
    (#x69 adc . Immediate)
    (#x65 adc . ZeroPage)
    (#x75 adc . ZeroPageX)
    (#x6d adc . Absolute)
    (#x7d adc . AbsoluteX)
    (#x79 adc . AbsoluteY)
    (#x61 adc . PreindexedIndirect)
    (#x71 adc . PostindexedIndirect)
    (#x29 and . Immediate)
    (#x25 and . ZeroPage)
    (#x35 and . ZeroPageX)
    (#x2d and . Absolute)
    (#x3d and . AbsoluteX)
    (#x39 and . AbsoluteY)
    (#x21 and . PreindexedIndirect)
    (#x31 and . PostindexedIndirect)
    (#x0a asl . Accumulator)
    (#x06 asl . ZeroPage)
    (#x16 asl . ZeroPageX)
    (#x0e asl . Absolute)
    (#x1e asl . AbsoluteX)
    (#x90 bcc . Relative)
    (#xb0 bcs . Relative)
    (#xf0 beq . Relative)
    (#x24 bit . ZeroPage)
    (#x2c bit . Absolute)
    (#x30 bmi . Relative)
    (#xd0 bne . Relative)
    (#x10 bpl . Relative)
    (#x00 brk . Implied)
    (#x50 bvc . Relative)
    (#x70 bvs . Relative)
    (#x18 clc . Implied)
    (#xd8 cld . Implied)
    (#x58 cli . Implied)
    (#xb8 clv . Implied)
    (#xc9 cmp . Immediate)
    (#xc5 cmp . ZeroPage)
    (#xd5 cmp . ZeroPageX)
    (#xcd cmp . Absolute)
    (#xdd cmp . AbsoluteX)
    (#xd9 cmp . AbsoluteY)
    (#xc1 cmp . PreindexedIndirect)
    (#xd1 cmp . PostindexedIndirect)
    (#xe0 cpx . Immediate)
    (#xe4 cpx . ZeroPage)
    (#xec cpx . Absolute)
    (#xc0 cpy . Immediate)
    (#xc4 cpy . ZeroPage)
    (#xcc cpy . Absolute)
    (#xc6 dec . ZeroPage)
    (#xd6 dec . ZeroPageX)
    (#xce dec . Absolute)
    (#xde dec . AbsoluteX)
    (#xca dex . Implied)
    (#x88 dey . Implied)
    (#x49 eor . Immediate)
    (#x45 eor . ZeroPage)
    (#x55 eor . ZeroPageX)
    (#x4d eor . Absolute)
    (#x5d eor . AbsoluteX)
    (#x59 eor . AbsoluteY)
    (#x41 eor . PreindexedIndirect)
    (#x51 eor . PostindexedIndirect)
    (#xe6 inc . ZeroPage)
    (#xf6 inc . ZeroPageX)
    (#xee inc . Absolute)
    (#xfe inc . AbsoluteX)
    (#xe8 inx . Implied)
    (#xc8 iny . Implied)
    (#x4c jmp . Absolute)
    (#x6c jmp . IndirectAbsolute)
    (#x20 jsr . Absolute)
    (#xa9 lda . Immediate)
    (#xa5 lda . ZeroPage)
    (#xb5 lda . ZeroPageX)
    (#xad lda . Absolute)
    (#xbd lda . AbsoluteX)
    (#xb9 lda . AbsoluteY)
    (#xa1 lda . PreindexedIndirect)
    (#xb1 lda . PostindexedIndirect)
    (#xa2 ldx . Immediate)
    (#xa6 ldx . ZeroPage)
    (#xb6 ldx . ZeroPageY)
    (#xae ldx . Absolute)
    (#xbe ldx . AbsoluteY)
    (#xa0 ldy . Immediate)
    (#xa4 ldy . ZeroPage)
    (#xb4 ldy . ZeroPageX)
    (#xac ldy . Absolute)
    (#xbc ldy . AbsoluteX)
    (#x4a lsr . Accumulator)
    (#x46 lsr . ZeroPage)
    (#x56 lsr . ZeroPageX)
    (#x4e lsr . Absolute)
    (#x5e lsr . AbsoluteX)
    (#xea nop . Implied)
    (#x09 ora . Immediate)
    (#x05 ora . ZeroPage)
    (#x15 ora . ZeroPageX)
    (#x0d ora . Absolute)
    (#x1d ora . AbsoluteX)
    (#x19 ora . AbsoluteY)
    (#x01 ora . PreindexedIndirect)
    (#x11 ora . PostindexedIndirect)
    (#x48 pha . Implied)
    (#x08 php . Implied)
    (#x68 pla . Implied)
    (#x28 plp . Implied)
    (#x2a rol . Accumulator)
    (#x26 rol . ZeroPage)
    (#x36 rol . ZeroPageX)
    (#x2e rol . Absolute)
    (#x3e rol . AbsoluteX)
    (#x6a ror . Accumulator)
    (#x66 ror . ZeroPage)
    (#x76 ror . ZeroPageX)
    (#x6e ror . Absolute)
    (#x7e ror . AbsoluteX)
    (#x40 rti . Implied)
    (#x60 rts . Implied)
    (#xe9 sbc . Immediate)
    (#xe5 sbc . ZeroPage)
    (#xf5 sbc . ZeroPageX)
    (#xed sbc . Absolute)
    (#xfd sbc . AbsoluteX)
    (#xf9 sbc . AbsoluteY)
    (#xe1 sbc . PreindexedIndirect)
    (#xf1 sbc . PostindexedIndirect)
    (#x38 sec . Implied)
    (#xf8 sed . Implied)
    (#x78 sei . Implied)
    (#x85 sta . ZeroPage)
    (#x95 sta . ZeroPageX)
    (#x8d sta . Absolute)
    (#x9d sta . AbsoluteX)
    (#x99 sta . AbsoluteY)
    (#x81 sta . PreindexedIndirect)
    (#x91 sta . PostindexedIndirect)
    (#x86 stx . ZeroPage)
    (#x96 stx . ZeroPageY)
    (#x8e stx . Absolute)
    (#x84 sty . ZeroPage)
    (#x94 sty . ZeroPageX)
    (#x8c sty . Absolute)
    (#xaa tax . Implied)
    (#xa8 tay . Implied)
    (#xba tsx . Implied)
    (#x8a txa . Implied)
    (#x9a txs . Implied)
    (#x98 tya . Implied))))

(define-key asm-mode-map (kbd "<C-return>") 'asm-split)
(define-key asm-mode-map (kbd "C-,") 'asm-join)
(define-key asm-mode-map (kbd "C-c C-c") 'asm-disassemble)
(define-key asm-mode-map (kbd "C-c C-b") 'asm-convert-to-bytes)
(define-key asm-mode-map (kbd "C-c C-t") 'asm-convert-to-text)
;(define-key asm-mode-map (kbd "C-c C-v") 'asm-convert-to-bytes-width)
(define-key asm-mode-map (kbd "C-c C-w") 'asm-convert-to-word)
(define-key asm-mode-map (kbd "C-c h +") 'asm-add-to-number)
(define-key asm-mode-map (kbd "C-c a") 'asm-goto-position)
(define-key asm-mode-map (kbd "C-c .") 'asm-goto-position-at-point)
(define-key asm-mode-map (kbd "C-c -") 'asm-relativize-jump)
; this one is more reliable but less functional
;(define-key asm-mode-map (kbd "C-c l") 'asm-convert-address-to-label)
(define-key asm-mode-map (kbd "C-c l") 'asm-replace-with-label)
(define-key asm-mode-map (kbd "C-c i -") 'asm-insert-break)
(define-key asm-mode-map (kbd "C-'") 'asm-cycle-define)
(define-key asm-mode-map (kbd "C-j") 'electric-newline-and-maybe-indent)
(define-key asm-mode-map (kbd "C-m") 'newline)
(define-key asm-mode-map (kbd "C-c C-n") 'asm/next-full-addr)

(add-hook 'asm-mode-hook 'sdh-setup-asm-mode)

(defun sdh-setup-asm-mode ()
  (setq tab-width 4)
  (setq indent-line-function 'insert-tab)
  (setq asm-indent-level 4))


;;;; kmacro for adding a .org before next label
;;#[256 "\211\301=\203
;; \301\300B\207\302\300\"\207" [([134217747 94 91 65 45 90 97 45 122 48 45 57 95 93 43 58 return 1 134217848 40 backspace 97 115 109 47 105 110 115 101 114 116 45 111 114 103 45 98 101 102 111 114 101 45 108 97 98 101 108 return down down] 0 "%d") kmacro--extract-lambda kmacro-exec-ring-item] 4 "Keyboard macro.

(defun asm-remove-address-and-bytes-old ()
  (interactive)
  (beginning-of-line)
  (cond
   ((looking-at "\\([-+ ]+\\|@?[A-Za-z0-9_]+: *\\)\\$[0-9a-f]\\{5\\}  \\(        \\|[0-9a-f]\\{2\\}\\(:      \\| [0-9a-f]\\{2\\}\\(:   \\| [0-9a-f]\\{2\\}:\\)\\)\\)   ")
    (search-forward "$")
    (backward-char 1)
    (delete-char 20))
   ((looking-at " +;+")
    (while (looking-at "[; ]") (delete-char 1))
    ;; Figure out where to indent to
    (insert (make-string (save-excursion
                           (re-search-backward "^ +[.a-z;]")
                           (re-search-forward "[.a-z;]")
                           (- (current-column) 1)) ? ))
    (insert ";; ")
    (when (looking-at "-+ *$")
      (kill-line)
      (insert "----"))))
  (beginning-of-line)
  (next-line))

(defun asm-remove-address-and-bytes (count)
  (interactive "p")
  (while (> count 0)
    (let (i)
      (beginning-of-line)
      (cond
       ((looking-at "\\([-+ ]+\\|@?[A-Za-z0-9_]+: *\\)\\$[0-9a-f]\\{5\\}  \\(        \\|[0-9a-f]\\{2\\}\\(:      \\| [0-9a-f]\\{2\\}\\(:   \\| [0-9a-f]\\{2\\}:\\)\\)\\)   ")
        ;; Instruction or data line
        (search-forward "$")
        (backward-char 1)
        (delete-char 20))
       ((looking-at " [; ]+-+ *$")
        ;; A ---- comment line
        ;; Replace it with a brand new comment at the same level but only 4 dashes
        (setq i (save-excursion (re-search-forward "-") (max 8 (- (current-column) 21))))
        (while (looking-at "[; -]") (delete-char 1))
        (insert (make-string i ? ) ";; ----"))
       ((looking-at " [; ]\\{27\\}")
        ;; A fully-indented comment: text is above instructions
        ;; Replace with a ;;-delimited comment starting 20 columns earlier
        (save-excursion
          (forward-char 28)
          (re-search-forward "[^ ]")
          (setq i (- (current-column) 21)))
        (while (looking-at "[; ]") (delete-char 1))
        (insert (make-string i ? ) ";; "))
       ;; Don't do this one because it messes up other spaces, and it's usually already OK
       ;; ((looking-at " [; ]+")
       ;;  ;; An indented comment, but the text starts before the instruction
       ;;  ;; Replace with an 8-column indentation
       ;;  (while (looking-at "[; ]") (delete-char 1))
       ;;  (insert "        ;; "))
       ((looking-at ";;?[^;]")
        ;; A non-indented comment: make sure there's at least 3 semicolons
        (while (looking-at ";") (delete-char 1))
        (insert ";;;"))
       )
      (beginning-of-line)
      (next-line))
    (setq count (- count 1))))
(defun asm-remove-16-address-and-bytes ()
  (interactive)
  (asm-remove-address-and-bytes 16))
(define-key asm-mode-map (kbd "C-9") 'asm-remove-16-address-and-bytes)


(defun asm-insert-org-before-next-label ()
  (interactive)
  (asm/next-label)
  (beginning-of-line)
  (asm/insert-org-before-label)
  (next-line 2))
(define-key asm-mode-map (kbd "C-2") 'asm-insert-org-before-next-label)

; Make "a1: .word (a2) \n a2: ..."
(fset 'asm-factor-out-simple-address
   (kmacro-lambda-form [?\C-c ?\C-w up return C-right ?\C-  C-left right ?\M-w ?\C-a up ?D ?a ?t ?a ?T ?a ?b ?l ?e ?_ ?\C-y ?\C-q ?: left left left left left left left down down ?\C-  C-right ?\M-w ?\C-a return up ?D ?a ?t ?a ?T ?a ?b ?l ?e ?_ ?\C-y ?: ?\C-_ ?\C-q ?: left ?\C-  ?\C-a ?\M-w left left backspace backspace backspace backspace backspace ?\C-y ?\C-_ ?\C-_ C-left ?\C-y ?\) ?  ?\C-q ?\; ?  ?\C-e backspace] 0 "%02x"))

; Cursor at start of label, replaces all other occurrences in buffer
(fset 'asm-replace-label-everywhere
   (kmacro-lambda-form [?\C-a ?\C-s ?: return left ?\C-  ?\C-a ?\C-x ?r ?s ?1 ?\C-\M-s ?^ ?  ?+ ?\\ ?$ return ?\C-  left ?\C-  C-right ?\C-x ?r ?s ?2 C-left right ?  ?\C-x ?r ?  ?0 ?\M-< ?\M-x ?r ?e ?p ?l ?a ?c ?e ?  ?s ?t ?r ?i ?n ?g return ?\C-x ?r ?i ?2 return ?\C-x ?r ?i ?1 return ?\C-x ?r ?j ?0 backspace ?\C-a] 0 "%02x"))

; Setup: Register 1 holds the root label (i.e. the address table name), words are correct
; 5-digit addresses, and numeric (label suffix) comments after each word.
; Follow up with asm-replace-word-addr-with-label
(fset 'asm-make-labels-for-address-table
   (kmacro-lambda-form [?\C-s ?. ?w ?o ?r ?d ?  ?\( return right ?\C-  C-right ?\C-x ?r ?s ?2 ?\C-s ?\; ?  return ?\C-  C-right ?\C-x ?r ?s ?3 ?\C-a ?\C-x ?r ?  ?0 ?\C-c ?a ?\C-x ?r ?i ?2 return ?\C-o ?\C-x ?r ?i ?1 ?\C-x ?r ?i ?3 ?\C-q ?: ?\C-x ?r ?j ?0 down] 0 "%02x"))



(fset 'asm-indent-dashes
   (kmacro-lambda-form [?  ?  ?  ?  ?  ?  ?  ?  right right right ?  ?  ?  ?  ?  ?  ?  ?  ?  ?  ?  ?  ?  ?  ?  ?  right up ?\C-r ?: return ?\C-\M-s ?  ?+ return ?\C-  down ?\C-  ?\C-r ?: backspace ?\; right ?\M-x ?r ?e ?p ?l ?a ?c ?e ?  ?s ?t ?r ?i ?n ?g return ?- return ?  return up ?\C-e down ?\C-  ?\C-e ?\C-x ?w ?\C-a] 0 "%d"))

(fset 'asm-replace-next-fulladdr-with-label
   (kmacro-lambda-form [?\M-x ?a ?s ?m ?/ ?n ?e ?x ?t ?- ?f ?u ?l ?l ?- ?a ?d ?d ?r ?\C-m ?\M-x ?a ?s ?m ?  ?r ?e ?p ?l ?a ?c ?e ?  ?w ?i ?t ?h ?  ?l ?a ?b ?e ?l ?\C-m] 0 "%d"))


(fset 'asm-replace-word-addr-with-label
   (kmacro-lambda-form [?\C-s ?. ?w ?o ?r ?d ?  ?\( ?$ ?\C-a ?\C-x ?r ?  ?0 ?\C-s ?\( ?\C-m right ?\C-  C-right ?\C-x ?r ?s ?1 ?\C-c ?a ?\C-x ?r ?i ?1 ?\C-m ?\C-\[ ?\C-r ?^ ?\[ ?A ?- ?Z ?a ?- ?z ?0 ?- ?9 ?_ ?\] ?+ ?: ?\C-m ?\C-  ?\C-s ?: left ?\C-x ?r ?s ?2 ?\C-x ?r ?j ?0 ?\C-s ?\( ?\C-m ?\C-  ?\C-s ?\) left ?\C-x ?w ?\C-x ?r ?i ?1 ?\C-_ ?\C-x ?r ?i ?2] 0 "%d"))



;; The macros had a problem where a +/- label on the same
;; line as a named label, the .org will be incorrect.  Find
;; these cases so we can fix them.
(defun asm-find-problem ()
  (interactive)
  (let ((looking t))
    (while looking
      (re-search-forward "^\\.org")
      (beginning-of-line)
      (next-line)
      (while (looking-at "^\\([A-Za-z0-9_]\\| *;\\)")
        (next-line))
      (if (looking-at "[-+]")
          (setq looking nil)))))


;;;; kmacro for replacing .word (...) with label
;; C-s			;; isearch-forward
;; .word			;; self-insert-command * 5
;; SPC			;; self-insert-command
;; ($			;; self-insert-command * 2
;; C-a			;; sdh-beginning-of-line
;; C-x r SPC		;; point-to-register
;; 0			;; self-insert-command
;; C-s			;; isearch-forward
;; (			;; self-insert-command
;; RET			;; newline
;; <right>			;; right-char
;; C-SPC			;; set-mark-command
;; <C-right>		;; forward-word
;; C-x r s			;; copy-to-register
;; 1			;; self-insert-command
;; C-c a			;; asm-goto-position
;; C-x r i			;; insert-register
;; 1			;; self-insert-command
;; RET			;; newline
;; ESC C-r			;; isearch-backward-regexp
;; ^[A-Za-z0-9_]+		;; self-insert-command * 14
;; :			;; asm-colon
;; RET			;; newline
;; C-SPC			;; set-mark-command
;; C-s			;; isearch-forward
;; :			;; asm-colon
;; <left>			;; left-char
;; C-x r s			;; copy-to-register
;; 2			;; self-insert-command
;; C-x r j			;; jump-to-register
;; 0			;; self-insert-command
;; C-s			;; isearch-forward
;; (			;; self-insert-command
;; RET			;; newline
;; C-SPC			;; set-mark-command
;; C-s			;; isearch-forward
;; )			;; self-insert-command
;; <left>			;; left-char
;; C-x w			;; delete-region
;; C-x r i			;; insert-register
;; 1			;; self-insert-command
;; C-_			;; undo
;; C-x r i			;; insert-register
;; 2			;; self-insert-command
