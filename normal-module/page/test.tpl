This is "test.tpl";
haha

{widget name="../widget/test-widget.tpl"}

{require name="../static/test.js"}
{require name="/static/test.css"}

<div className=cx(require('/static/test.css').container)>
</div>

{pagelet className=cx(
  require('/static/test.css').container,
  require('/static/test.css').g-ib,
)}
{/pagelet}

{script}
require.async("../static/async.js");
{/script}

<script runat="server">
var test = require("/static/test.js");
</script>