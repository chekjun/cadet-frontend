import { MathJaxContext } from 'better-react-mathjax';
import { mount, shallow } from 'enzyme';
import lzString from 'lz-string';
import { mathjaxConfig } from 'src/pages/sicp/Sicp';

import { JsonType, parseArr, ParseJsonError, parseObj, processingFunctions } from '../ParseJson';

// Tags to process
const headingTags = ['SUBHEADING', 'SUBSUBHEADING'];
const sectionTags = ['SECTION', 'SUBSECTION', 'SUBSUBSECTION', 'MATTER', 'CHAPTER', 'REFERENCES'];
const listTags = ['OL', 'UL'];
const symbolTags = ['BR', 'LaTeX', 'TeX'];
const stylingTags = ['B', 'EM', 'JAVASCRIPTINLINE', 'TT', 'METAPHRASE', 'META'];
const latexTags = ['LATEX', 'LATEXINLINE'];
const linkTags = ['LINK', 'REF', 'FOOTNOTE_REF'];

const epigraphTag = 'EPIGRAPH';
const tableTag = 'TABLE';
const exerciseTag = 'EXERCISE';
const snippetTag = 'SNIPPET';
const figureTag = 'FIGURE';
const displayFootnoteTag = 'DISPLAYFOOTNOTE';
const referenceTag = 'REFERENCE';
const textTag = '#text';
const unknownTag = 'unknown';

jest.mock('src/commons/utils/Constants', () => ({
  Links: {
    sourceDocs: ''
  },
  interactiveSicpUrl: 'source-academy.github.io/sicp/'
}));

const mockData = {
  text: {
    tag: textTag,
    body: 'Mock Text'
  },
  listItem: {
    tag: 'LI',
    child: [{ tag: textTag, body: 'Mock Text' }]
  }
};

const mockRef = { current: {} };

const processTag = (tag: string, obj: JsonType, math: boolean) => {
  obj['tag'] = tag;

  return math ? (
    <MathJaxContext version={3} config={mathjaxConfig}>
      {processingFunctions[tag](obj, mockRef)}
    </MathJaxContext>
  ) : (
    processingFunctions[tag](obj, mockRef)
  );
};

const testTagSuccessful = (obj: JsonType, tag: string, text: string = '', math = false) => {
  test(tag + ' ' + text + ' successful', () => {
    const tree = shallow(processTag(tag, obj, math));

    expect(tree.debug()).toMatchSnapshot();
  });
};

const objWithText = (obj: JsonType, text: string) => {
  return {
    obj: obj,
    text: text
  };
};

describe('Parse heading', () => {
  const tags = headingTags;
  const obj = { child: [mockData['text']] };

  tags.forEach(x => testTagSuccessful(obj, x));
});

describe('Parse section', () => {
  const tags = sectionTags;
  const text = { tag: 'TEXT', child: [mockData['text'], mockData['text']] };
  const content = [text, text];
  const obj = { body: 'Title', child: content };

  tags.forEach(x => testTagSuccessful(obj, x));
});

describe('Parse list', () => {
  const tags = listTags;
  const obj = { child: [mockData['listItem']] };

  tags.forEach(x => testTagSuccessful(obj, x));
});

describe('Parse symbol', () => {
  const tags = symbolTags;
  const obj = {};

  tags.forEach(x => testTagSuccessful(obj, x));
});

describe('Parse styling', () => {
  const tags = stylingTags;
  const obj = { child: [mockData['text']] };

  tags.forEach(x => testTagSuccessful(obj, x));
});

describe('Parse epigraph', () => {
  const tag = epigraphTag;
  const child = [mockData['text']];
  const author = 'Author';
  const title = 'Title';
  const date = '2021';

  const withNone = objWithText({ child: child }, 'with none');
  const withAuthor = objWithText({ child: child, author: author }, 'with author');
  const withTitle = objWithText({ child: child, title: title }, 'with title');
  const withDate = objWithText({ child: child, date: date }, 'with date');
  const withAll = objWithText(
    { child: child, author: author, title: title, date: date },
    'with all'
  );

  const objsToTest = [withNone, withAuthor, withTitle, withDate, withAll];
  objsToTest.forEach(obj => testTagSuccessful(obj['obj'], tag, obj['text']));
});

describe('Parse table', () => {
  const tag = tableTag;
  const td = {
    child: [mockData['text']]
  };
  const tr = {
    child: [td, td]
  };
  const obj = {
    child: [tr, tr]
  };

  testTagSuccessful(obj, tag);
});

describe('Parse exercise', () => {
  const tag = exerciseTag;
  const title = 'Title';
  const child = [mockData['text']];
  const solution = [mockData['text']];
  const withoutSolution = objWithText({ title: title, child: child }, 'without solution');
  const withSolution = objWithText({ ...withoutSolution, solution: solution }, 'with solution');

  const objsToTest = [withoutSolution, withSolution];

  objsToTest.forEach(obj => testTagSuccessful(obj['obj'], tag, obj['text']));
});

describe('Parse snippet', () => {
  const tag = snippetTag;
  const body = '1 + 1;';
  const output = '2';
  const prependString = 'const a = 1;';
  const withoutPrepend = lzString.compressToEncodedURIComponent(body);
  const program = lzString.compressToEncodedURIComponent(prependString + '\n' + body);
  const prepend = lzString.compressToEncodedURIComponent(prependString);

  const base = {
    id: 'id',
    withoutPrepend: withoutPrepend,
    body: body
  };

  const objWithoutPrepend = objWithText(
    {
      ...base
    },
    'without prepend'
  );
  const objWithoutPrependWithOutput = objWithText(
    {
      ...base,
      output: output
    },
    'without prepend with output'
  );
  const objWithPrepend = objWithText(
    {
      ...base,
      program: program,
      prepend: prepend
    },
    'with prepend'
  );
  const objNoEval = objWithText(
    {
      ...base,
      eval: false
    },
    'no eval'
  );
  const objLatex = objWithText(
    {
      ...base,
      latex: true
    },
    'with latex'
  );

  const objsToTest = [
    objWithoutPrepend,
    objWithPrepend,
    objWithoutPrependWithOutput,
    objNoEval,
    objLatex
  ];

  objsToTest.forEach(obj => testTagSuccessful(obj['obj'], tag, obj['text'], true));
});

describe('Parse figures', () => {
  const tag = figureTag;
  const src = 'sicp.png';
  const scale = '50%';

  // snippet
  const body = '1 + 1;';
  const withoutPrepend = lzString.compressToEncodedURIComponent(body);
  const snippet = {
    withoutPrepend: withoutPrepend,
    body: body
  };

  // table
  const td = {
    child: [mockData['text']]
  };
  const tr = {
    child: [td, td]
  };
  const table = {
    child: [tr, tr]
  };

  const base = {
    id: 'id',
    captionName: 'name',
    captionBody: [mockData['text']]
  };
  const image = objWithText(
    {
      ...base,
      src: src
    },
    'with image'
  );
  const imageWithScale = objWithText(
    {
      ...base,
      src: src,
      scale: scale
    },
    'with image and scale'
  );
  const withSnippet = objWithText(
    {
      ...base,
      snippet: snippet
    },
    'with snippet'
  );
  const withTable = objWithText(
    {
      ...base,
      table: table
    },
    'with table'
  );

  const objsToTest = [image, imageWithScale, withSnippet, withTable];
  objsToTest.forEach(obj => testTagSuccessful(obj['obj'], tag, obj['text']));
});

describe('Parse footnote', () => {
  const tag = displayFootnoteTag;
  const href = '';
  const obj = {
    href: href,
    child: [mockData['text']]
  };

  testTagSuccessful({ ...obj, count: 1 }, tag, 'count is 1');
  testTagSuccessful({ ...obj, count: 2 }, tag, 'count is 2');
});

describe('Parse latex', () => {
  const tag = latexTags;
  const math = '$test$';
  const obj = {
    body: math
  };

  tag.forEach(tag => testTagSuccessful(obj, tag, '', true));
});

describe('Parse links', () => {
  const tag = linkTags;
  const href = 'bad-link';
  const body = 'link';
  const obj = {
    id: 'id',
    body: body,
    href: href
  };

  tag.forEach(tag => testTagSuccessful(obj, tag));
});

describe('Parse reference', () => {
  const tag = referenceTag;
  const child = [mockData['text']];
  const obj = {
    child: child
  };

  testTagSuccessful(obj, tag);
});

describe('Parse object', () => {
  test('successful', () => {
    const obj = mockData['text'];
    const tree = shallow(parseObj(obj, 0, mockRef));
    expect(tree.debug()).toMatchSnapshot();
  });

  test('tag not found', () => {
    const tag = unknownTag;
    const obj = { tag: tag, body: 'text' };

    expect(() => parseObj(obj, 0, mockRef)).toThrowError(ParseJsonError);
  });

  test('no tag', () => {
    const obj = { child: [mockData['text']] };
    const tree = mount(parseObj(obj, 0, mockRef));

    expect(tree.debug()).toMatchSnapshot();
  });
});

describe('Parse array', () => {
  test('no child successful', () => {
    const arr = [] as JsonType[];
    const tree = mount(parseArr(arr, mockRef));
    expect(tree.debug()).toMatchSnapshot();
  });

  test('one child successful', () => {
    const arr = [mockData['text']];
    const tree = mount(parseArr(arr, mockRef));
    expect(tree.debug()).toMatchSnapshot();
  });

  test('two child successful', () => {
    const arr = [mockData['text'], mockData['text']];
    const tree = mount(parseArr(arr, mockRef));
    expect(tree.debug()).toMatchSnapshot();
  });
});
