import {
    ContentEditableEvent,
    createButton,
    Editor,
    EditorProvider,
    Toolbar,
} from 'react-simple-wysiwyg'
import sanitizeHtml from '../../utils/sanitizeHtml'
import './editor-input.scss'
import { ClipboardEvent } from 'react'

type EditorInputProps = {
    value: string
    onChange: (value: string) => void
}

const BtnLinkCustom = createButton(
    'Вставить ссылку',
    'Ссылка',
    ({ $selection }) => {
        if ($selection?.nodeName === 'A') {
            document.execCommand('unlink')
            return
        }

        const input = window.prompt('Введите ссылку с https:// или http://')

        if (!input?.trim()) {
            return
        }

        let url: URL

        try {
            url = new URL(input.trim())
        } catch {
            return
        }

        if (!['https:', 'http:'].includes(url.protocol)) {
            return
        }

        document.execCommand('createLink', false, url.href)
    }
)

export default function EditorInput({ onChange, value }: EditorInputProps) {
    function handleChangeElement(event: ContentEditableEvent) {
        onChange(sanitizeHtml(event.target.value))
    }

    function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
        event.preventDefault()

        const text = event.clipboardData.getData('text/plain')

        document.execCommand('insertText', false, text)
    }
    return (
        <div className='customEditor' onPaste={handlePaste}>
            <EditorProvider>
                <Editor
                    value={sanitizeHtml(value)}
                    onChange={handleChangeElement}
                >
                    <Toolbar>
                        <span className='rsw-link-title'>
                            Вставить ссылку <BtnLinkCustom />
                        </span>
                    </Toolbar>
                </Editor>
            </EditorProvider>
        </div>
    )
}
