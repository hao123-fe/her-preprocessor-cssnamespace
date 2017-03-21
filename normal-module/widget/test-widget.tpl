{define}
{require name="/static/test.js"}
{require name="/static/test.css"}

<div className={sc(
  require('/static/test.css').widget/public,
  .widget/pure,
  .widget-override
)} style="width:120px;">
{**
 * <div class="_ahs _sng">
 *    <a class="_and _dkg">Button Large</a>
 * </div>
 * in test.css
 * ._ahs{} // .widget
 * ._and{} // .button
 *
 * in test-widget.css
 * ._sng{} // .widget-override
 * ._sng ._dkg{} // .button-large
 *
 *}
  <a className={sc(
  require('/static/test.css').button/public,
  .button-large,
  .js_button
  )}>Button Large</a>
</div>

{*
{script}
require("/static/test.js");
{/script}
*}

{script}
require("/static/test.js");

{* 
var js_button = sc(.js_button);
var js_button_public = sc(require('/widget/test-widget.tpl').js_button/public);
*}
{/script}
{/define}