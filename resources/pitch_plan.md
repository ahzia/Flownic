When I registered for this hackthon, I drafted more 10 diffrent idea that could be build using one or more of the chrome builtin ai apis, becouse these APIs are very useful, then I thaught why not build a tool which will give noral non-code user access to these APIs, so they can use anyway they wish

somthing like n8n or google p but offline and with chrome builtin ai

so we build Flownic - a chrome extension that will allow user to create ai workflows using google chrome APIs and run it

here is how it works.

First screen capture video:
lets say I want to build a summerizer workflow that will summerize any content from any language to me in english in any website
so I click on create new workflow, and describe it
after I click on genrate with ai, it will build the workflow for me, here is what this spesific workflow does:
it gets trigered manualy by shortcut then it gets extracted text page using the context provider, uses the summerizer API to summerize it, then it moves to  trasnlate API... and at the last part of the workflow it shows the modal

lets save this workflow and try it

I can run the workflow we just created using the shortcuts like this, and here is the result
