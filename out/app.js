const vscode_1 = require("vscode");
const prettyHTML = require('pretty');
const TAGS = require("./template-tags.json");
const ATTRS = require("./template-attributes.json");

class ElementCompletionItemProvider {
  constructor() {
      this.tagReg = /<([\w-]+)\s+/g;
      this.attrReg = /(?:\(|\s*)(\w+)=['"][^'"]*/;
      this.tagStartReg = /<([\w-]*)$/;
  }
  getPreTag() {
      let line = this._position.line;
      let tag;
      let txt = this.getTextBeforePosition(this._position);
      while (this._position.line - line < 10 && line >= 0) {
          if (line !== this._position.line) {
              txt = this._document.lineAt(line).text;
          }
          tag = this.matchTag(this.tagReg, txt, line);
          if (tag === 'break')
              return;
          if (tag)
              return tag;
          line--;
      }
      return;
  }
  getPreAttr() {
      let txt = this.getTextBeforePosition(this._position).replace(/"[^'"]*(\s*)[^'"]*$/, '');
      let end = this._position.character;
      let start = txt.lastIndexOf(' ', end) + 1;
      let parsedTxt = this._document.getText(new vscode_1.Range(this._position.line, start, this._position.line, end));
      return this.matchAttr(this.attrReg, parsedTxt);
  }
  matchAttr(reg, txt) {
      let match;
      match = reg.exec(txt);
      return !/"[^"]*"/.test(txt) && match && match[1];
  }
  matchTag(reg, txt, line) {
      let match;
      let arr = [];
      if (/<\/?[-\w]+[^<>]*>[\s\w]*<?\s*[\w-]*$/.test(txt) || (this._position.line === line && (/^\s*[^<]+\s*>[^<\/>]*$/.test(txt) || /[^<>]*<$/.test(txt[txt.length - 1])))) {
          return 'break';
      }
      while ((match = reg.exec(txt))) {
          arr.push({
              text: match[1],
              offset: this._document.offsetAt(new vscode_1.Position(line, match.index))
          });
      }
      return arr.pop();
  }
  getTextBeforePosition(position) {
      var start = new vscode_1.Position(position.line, 0);
      var range = new vscode_1.Range(start, position);
      return this._document.getText(range);
  }
  getTagSuggestion() {
      let suggestions = [];
      let id = 100;
      for (let tag in TAGS) {
          suggestions.push(this.buildTagSuggestion(tag, TAGS[tag], id));
          id++;
      }
      return suggestions;
  }
  getAttrValueSuggestion(tag, attr) {
      let suggestions = [];
      const values = this.getAttrValues(tag, attr);
      values.forEach(value => {
          suggestions.push({
              label: value,
              kind: vscode_1.CompletionItemKind.Value
          });
      });
      return suggestions;
  }
  getAttrSuggestion(tag) {
      let suggestions = [];
      let tagAttrs = this.getTagAttrs(tag);
      let preText = this.getTextBeforePosition(this._position);
      let prefix = preText.replace(/['"]([^'"]*)['"]$/, '').split(/\s|\(+/).pop();
      // method attribute
      const method = prefix[0] === '@';
      // bind attribute
      const bind = prefix[0] === ':';
      prefix = prefix.replace(/[:@]/, '');
      if (/[^@:a-zA-z\s]/.test(prefix[0])) {
          return suggestions;
      }
      tagAttrs.forEach(attr => {
          const attrItem = this.getAttrItem(tag, attr);
          if (attrItem && (!prefix.trim() || this.firstCharsEqual(attr, prefix))) {
              const sug = this.buildAttrSuggestion({ attr, tag, bind, method }, attrItem);
              sug && suggestions.push(sug);
          }
      });
      for (let attr in ATTRS) {
          const attrItem = this.getAttrItem(tag, attr);
          if (attrItem && attrItem.global && (!prefix.trim() || this.firstCharsEqual(attr, prefix))) {
              const sug = this.buildAttrSuggestion({ attr, tag: null, bind, method }, attrItem);
              sug && suggestions.push(sug);
          }
      }
      return suggestions;
  }
  buildTagSuggestion(tag, tagVal, id) {
      const snippets = [];
      let index = 0;
      let that = this;
      function build(tag, { subtags, defaults }, snippets) {
          let attrs = '';
          defaults && defaults.forEach((item, i) => {
              attrs += ` ${item}=${that.quotes}$${index + i + 1}${that.quotes}`;
          });
          snippets.push(`${index > 0 ? '<' : ''}${tag}${attrs}>`);
          index++;
          subtags && subtags.forEach(item => build(item, TAGS[item], snippets));
          snippets.push(`</${tag}>`);
      }
      ;
      build(tag, tagVal, snippets);
      return {
          label: tag,
          sortText: `0${id}${tag}`,
          insertText: new vscode_1.SnippetString(prettyHTML('<' + snippets.join(''), { indent_size: this.size }).substr(1)),
          kind: vscode_1.CompletionItemKind.Snippet,
          detail: `element-ui ${tagVal.version ? `(version: ${tagVal.version})` : ''}`,
          documentation: tagVal.description
      };
  }
  buildAttrSuggestion({ attr, tag, bind, method }, { description, type, version }) {
      if ((method && type === "method") || (bind && type !== "method") || (!method && !bind)) {
          return {
              label: attr,
              insertText: (type && (type === 'flag')) ? `${attr} ` : new vscode_1.SnippetString(`${attr}=${this.quotes}$1${this.quotes}$0`),
              kind: (type && (type === 'method')) ? vscode_1.CompletionItemKind.Method : vscode_1.CompletionItemKind.Property,
              detail: tag ? `<${tag}> ${version ? `(version: ${version})` : ''}` : `element-ui ${version ? `(version: ${version})` : ''}`,
              documentation: description
          };
      }
      else {
          return;
      }
  }
  getAttrValues(tag, attr) {
      let attrItem = this.getAttrItem(tag, attr);
      let options = attrItem && attrItem.options;
      if (!options && attrItem) {
          if (attrItem.type === 'boolean') {
              options = ['true', 'false'];
          }
          else if (attrItem.type === 'icon') {
              options = ATTRS['icons'];
          }
          else if (attrItem.type === 'shortcut-icon') {
              options = [];
              ATTRS['icons'].forEach(icon => {
                  options.push(icon.replace(/^fa-/, ''));
              });
          }
      }
      return options || [];
  }
  getTagAttrs(tag) {
      return (TAGS[tag] && TAGS[tag].attributes) || [];
  }
  getAttrItem(tag, attr) {
      return ATTRS[`${tag}/${attr}`] || ATTRS[attr];
  }
  isAttrValueStart(tag, attr) {
      return tag && attr;
  }
  isAttrStart(tag) {
      return tag;
  }
  isTagStart() {
      let txt = this.getTextBeforePosition(this._position);
      return this.tagStartReg.test(txt);
  }
  firstCharsEqual(str1, str2) {
      if (str2 && str1) {
          return str1[0].toLowerCase() === str2[0].toLowerCase();
      }
      return false;
  }
  // tentative plan for vue file
  notInTemplate() {
      let line = this._position.line;
      while (line) {
          if (/^\s*<script.*>\s*$/.test(this._document.lineAt(line).text)) {
              return true;
          }
          line--;
      }
      return false;
  }
  provideCompletionItems(document, position, token) {
      this._document = document;
      this._position = position;
      const config = vscode_1.workspace.getConfiguration('vscode-zcms-helper');
      this.size = config.get('indent-size');
      const normalQuotes = config.get('quotes') === 'double' ? '"' : "'";
      this.quotes = normalQuotes;
      let tag =  this.getPreTag();
      let attr = this.getPreAttr();
      if (this.isAttrValueStart(tag, attr)) {
          return this.getAttrValueSuggestion(tag.text, attr);
      }
      else if (this.isAttrStart(tag)) {
          return this.getAttrSuggestion(tag.text);
      }
      else if (this.isTagStart()) {
          switch (document.languageId) {
              case 'vue':
                  return this.notInTemplate() ? [] : this.getTagSuggestion();
              case 'html':
                  // todo
                  return this.getTagSuggestion();
          }
      }
      else {
          return [];
      }
  }

}
exports.ElementCompletionItemProvider = ElementCompletionItemProvider;
