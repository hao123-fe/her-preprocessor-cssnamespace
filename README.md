# her-preprocessor-cssnamespace
manage css class names, provide css namespace and cross-module access detect or dead code detect.
it also output a css namespace and access map for the runtime or other processor.

## usage

```html
<!-- widget.tpl -->
<div className={sc(
  require('/static/common.css').widget/public, 
  .widget/pure,
  .widget-override
)} style="width:120px;">
  <a className={sc(
  require('/static/common.css').button/public,
  .button-large
  )}>Button Large</a>
</div>
```

```css
/* common.css */
/* only class names with /public tag can be accessed by other tpls. */
.widget/public{
  color: red;
  height: 200px;
}

.button/public{
  height: 20px;
  width: 50px;
}
```

```css
/* widget.css */
.widget-override{
  color: blue;
}
/* class names with /pure tag will not changed yet. */
.widget/pure{
  font-size: 12px;
}
.button-large{
  width: 100px;
}
```

#### after process, you can get namespaced classNames in tpl and selectors in css, you can also change them all to md5s

```html
<!-- widget.tpl -->
<div class="common_widget_public widget widget_widget-override" style="width:120px;">
  <a className="common_button_public widget_button-large">Button Large</a>
</div>
```

```css
/* widget.css */
.widget_widget-override{
  color: blue;
}

.widget_button-large{
  width: 100px;
}
```

```css
/* common.css */
.common_widget_public{
  color: red;
  height: 200px;
}
/* because of the /pure tag */
.widget{
  font-size: 12px;
}
.common_button_public{
  height: 20px;
  width: 50px;
}
```
