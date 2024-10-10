import './index.scss'
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { IAnnotationComment, IAnnotationStore, PdfjsAnnotationSubtype } from '../../const/definitions'
import { useTranslation } from 'react-i18next'
import { formatPDFDate, formatTimestamp, generateUUID } from '../../utils/utils'
import { Button, Dropdown, Input } from 'antd'
import {
    MoreOutlined
} from '@ant-design/icons';
import {
    CircleIcon,
    FreehandIcon,
    FreeHighlightIcon,
    FreetextIcon,
    HighlightIcon,
    RectangleIcon,
    StampIcon,
    StrikeoutIcon,
    UnderlineIcon,
    DownloadIcon
} from '../../const/icon'

const iconMapping: Record<PdfjsAnnotationSubtype, React.ReactNode> = {
    Circle: <CircleIcon />,
    FreeText: <FreetextIcon />,
    Ink: <FreehandIcon />,
    Highlight: <HighlightIcon />,
    Underline: <UnderlineIcon />,
    Squiggly: <FreeHighlightIcon />,
    StrikeOut: <StrikeoutIcon />,
    Stamp: <StampIcon />,
    Line: <FreehandIcon />,
    Square: <RectangleIcon />,
    Polygon: <FreehandIcon />,
    PolyLine: <FreehandIcon />,
    Caret: <FreehandIcon />,
    Link: <FreehandIcon />,
    Text: <FreetextIcon />,
    FileAttachment: <DownloadIcon />,
    Popup: <FreehandIcon />,
    Widget: <FreehandIcon />
};

const getIconBySubtype = (subtype: PdfjsAnnotationSubtype): React.ReactNode => {
    return iconMapping[subtype] || null;
};

const AnnotationIcon: React.FC<{ subtype: PdfjsAnnotationSubtype }> = ({ subtype }) => {
    const Icon = getIconBySubtype(subtype);
    return Icon ? <span className="annotation-icon">{Icon}</span> : null;
};

const { TextArea } = Input

interface CustomCommentProps {
    onSelected: (annotation: IAnnotationStore) => void
    onUpdate: (annotation: IAnnotationStore) => void
    onDelete: (id: string) => void
}

export interface CustomCommentRef {
    addAnnotation(annotation: IAnnotationStore): void
    selectedAnnotation(annotation: IAnnotationStore): void
}

/**
 * @description CustomComment
 */
const CustomComment = forwardRef<CustomCommentRef, CustomCommentProps>(function CustomComment(props, ref) {
    const [annotations, setAnnotations] = useState<IAnnotationStore[]>([])
    const [currentAnnotation, setCurrentAnnotation] = useState<IAnnotationStore | null>(null)
    const [replyAnnotation, setReplyAnnotation] = useState<IAnnotationStore | null>(null)
    const [currentReply, setCurrentReply] = useState<IAnnotationComment | null>(null)
    const [editAnnotation, setEditAnnotation] = useState<IAnnotationStore | null>(null)
    const { t } = useTranslation()

    const annotationRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useImperativeHandle(ref, () => ({
        addAnnotation,
        selectedAnnotation
    }))

    const addAnnotation = (annotation: IAnnotationStore) => {
        setAnnotations(prevAnnotations => [...prevAnnotations, annotation])
    }

    const selectedAnnotation = (annotation: IAnnotationStore) => {
        console.log(123123)
        setCurrentAnnotation(annotation)
        // 滚动到对应的注释
        const element = annotationRefs.current[annotation.id];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }


    const groupedAnnotations = annotations.reduce((acc, annotation) => {
        if (!acc[annotation.pageNumber]) {
            acc[annotation.pageNumber] = []
        }
        acc[annotation.pageNumber].push(annotation)
        return acc
    }, {} as Record<number, IAnnotationStore[]>)

    const handleAnnotationClick = (annotation: IAnnotationStore) => {
        setCurrentAnnotation(annotation)
        props.onSelected(annotation)
    }

    const updateComment = (annotation: IAnnotationStore, comment: string) => {
        annotation.contentsObj.text = comment
        props.onUpdate(annotation)
    }

    const addReply = (annotation: IAnnotationStore, comment: string) => {
        annotation.comments.push({
            id: generateUUID(),
            title: 'username',
            date: formatTimestamp(Date.now()),
            content: comment
        })
        props.onUpdate(annotation)
    }

    const updateReply = (annotation: IAnnotationStore, reply: IAnnotationComment, comment: string) => {
        reply.date = formatTimestamp(Date.now())
        reply.content = comment
        reply.title = 'username'
        props.onUpdate(annotation)
    }

    const deleteAnnotation = (annotation: IAnnotationStore) => {
        setAnnotations(prevAnnotations =>
            prevAnnotations.filter(item => item.id !== annotation.id)
        );
        if (currentAnnotation?.id === annotation.id) {
            setCurrentAnnotation(null);
        }
        if (replyAnnotation?.id === annotation.id) {
            setReplyAnnotation(null);
        }
        setCurrentReply(null);
        props.onDelete(annotation.id)
    }

    const deleteReply = (annotation: IAnnotationStore, reply: IAnnotationComment) => {
        let updatedAnnotation: IAnnotationStore | null = null;

        setAnnotations(prevAnnotations =>
            prevAnnotations.map(item => {
                if (item.id === annotation.id) {
                    const updatedComments = item.comments.filter(comment => comment.id !== reply.id);
                    updatedAnnotation = { ...item, comments: updatedComments };
                    return updatedAnnotation;
                }
                return item;
            })
        );
        if (currentReply?.id === reply.id) {
            setCurrentReply(null);
        }
        if (updatedAnnotation) {
            props.onUpdate(updatedAnnotation);
        }
    };




    // Comment 编辑框
    const commentInput = useCallback((annotation: IAnnotationStore) => {
        let comment = ''
        if (editAnnotation && currentAnnotation?.id === annotation.id) {
            return (
                <>
                    <TextArea defaultValue={annotation.contentsObj.text} autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setEditAnnotation(null)} onChange={(e) => comment = e.target.value} />
                    <Button type="primary" block onMouseDown={() => {
                        updateComment(annotation, comment)
                    }}>Confirm</Button>
                </>
            )
        }
        return <p>{annotation.contentsObj.text}</p>
    }, [editAnnotation, currentAnnotation])

    // 回复框
    const replyInput = useCallback((annotation: IAnnotationStore) => {
        let comment = ''
        if (replyAnnotation && currentAnnotation?.id === annotation.id) {
            return (
                <>
                    <TextArea autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setReplyAnnotation(null)} onChange={(e) => comment = e.target.value} />
                    <Button type="primary" block onMouseDown={() => {
                        addReply(annotation, comment)
                    }}>Confirm</Button>
                </>
            )
        }
        return null
    }, [replyAnnotation, currentAnnotation])

    // 编辑回复框
    const editReplyInput = useCallback((annotation: IAnnotationStore, reply: IAnnotationComment) => {
        let comment = ''
        if (currentReply && currentReply?.id === reply.id) {
            return (
                <>
                    <TextArea defaultValue={currentReply.content} autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setCurrentReply(null)} onChange={(e) => comment = e.target.value} />
                    <Button type="primary" block onMouseDown={() => {
                        updateReply(annotation, reply, comment)
                    }}>Confirm</Button>
                </>
            )
        }
        return <p>{reply.content}</p>
    }, [replyAnnotation, currentReply])

    const comments = Object.entries(groupedAnnotations).map(([pageNumber, annotationsForPage]) => (
        <div key={pageNumber}>
            <h3>Page {pageNumber}</h3>
            {annotationsForPage.map((annotation) => {
                const isSelected = annotation.id === currentAnnotation?.id
                const commonProps = { className: isSelected ? 'comment selected' : 'comment' }

                return (
                    <div {...commonProps} key={annotation.id} onClick={() => handleAnnotationClick(annotation)} ref={el => (annotationRefs.current[annotation.id] = el)} >
                        <div className='title'>
                            <AnnotationIcon subtype={annotation.subtype} />
                            {annotation.title}
                            <span className='tool'>
                                {formatPDFDate(annotation.date)}
                                <Dropdown menu={{
                                    items: [
                                        {
                                            label: 'Reply',
                                            key: '0',
                                            onClick: (e) => {
                                                e.domEvent.stopPropagation()
                                                setReplyAnnotation(annotation)
                                            }
                                        },
                                        {
                                            label: 'Edit',
                                            key: '1',
                                            onClick: (e) => {
                                                e.domEvent.stopPropagation()
                                                setEditAnnotation(annotation)
                                            }

                                        },
                                        {
                                            label: 'Delete',
                                            key: '3',
                                            onClick: (e) => {
                                                e.domEvent.stopPropagation()
                                                deleteAnnotation(annotation)
                                            }
                                        },
                                    ]
                                }} trigger={['click']}>
                                    <span className='icon'>
                                        <MoreOutlined />
                                    </span>
                                </Dropdown>
                            </span>
                        </div>
                        {commentInput(annotation)}
                        {annotation.comments?.map((reply, index) => (
                            <div className='reply' key={index}>
                                <div className='title'>
                                    {reply.title}
                                    <span className='tool'>{formatPDFDate(reply.date)}
                                        <Dropdown menu={{
                                            items: [
                                                {
                                                    label: 'Edit',
                                                    key: '1',
                                                    onClick: (e) => {
                                                        e.domEvent.stopPropagation()
                                                        setCurrentReply(reply)
                                                    }
                                                },
                                                {
                                                    label: 'Delete',
                                                    key: '2',
                                                    onClick: (e) => {
                                                        e.domEvent.stopPropagation()
                                                        deleteReply(annotation, reply)
                                                    }
                                                },
                                            ]
                                        }} trigger={['click']}>
                                            <span className='icon'>
                                                <MoreOutlined />
                                            </span>
                                        </Dropdown>
                                    </span>
                                </div>
                                {editReplyInput(annotation, reply)}
                            </div>
                        ))}
                        <div className='reply-input'>
                            {replyInput(annotation)}
                            {!replyAnnotation && !currentReply && !editAnnotation && currentAnnotation?.id === annotation.id && (
                                <Button onClick={() => setReplyAnnotation(annotation)} type="primary" block>
                                    Click to reply
                                </Button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    ))

    return (
        <div className="CustomComment">
            <div className='filters'>共 {annotations.length} 个注释</div>
            <div className='list'>{comments}</div>
        </div>
    )
})

export { CustomComment }