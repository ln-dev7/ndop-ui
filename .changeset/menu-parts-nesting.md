---
'@ndop/metadata': patch
---

`ndop verify` no longer reports `usage/wrong-nesting` on correctly built Dropdown Menu, Context Menu and Menubar templates. Metadata took a part's own composed behavior, such as a menu item's, for something it had to sit inside, and asked for items inside sub-menu triggers. Radio items still have to sit in a radio group.
