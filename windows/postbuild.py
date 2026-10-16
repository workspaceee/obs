"""Strip cloud-only analytics/scripts from the local Windows web build."""
import re, sys
p = sys.argv[1] if len(sys.argv) > 1 else '/app/windows/web/index.html'
s = open(p, encoding='utf-8').read()
s = re.sub(r'<script src="https://assets\.emergent\.sh[^"]*"></script>', '', s)
s = re.sub(r'<script>!function\(e,r\)\{var t,s,o,i;r\.__SV.*?</script>', '', s, flags=re.S)
s = s.replace('content="A product of emergent.sh"', 'content="IMBA Widgets"')
open(p, 'w', encoding='utf-8').write(s)
print('emergent:', s.count('emergent'), 'posthog:', s.count('posthog'))
