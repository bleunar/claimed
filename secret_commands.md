#### setup files of docker secrets
```bash
for file in *; do [ -f "$file" ] && cp "$file" ".$file"; done
```
