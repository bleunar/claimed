import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Container, Row, Col, ListGroup, Card, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getAvailableDocumentation, getDocById } from '../utils/DocumentationService';
import { Book, ChevronRight, InfoCircle } from 'react-bootstrap-icons';

const DocumentationsPage = () => {
    const { user } = useAuth();
    const [availableDocs, setAvailableDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [markdownContent, setMarkdownContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            const docs = getAvailableDocumentation(user.role);
            setAvailableDocs(docs);
            if (docs.length > 0) {
                handleDocSelect(docs[0]);
            }
        }
    }, [user]);

    const handleDocSelect = async (doc) => {
        setSelectedDoc(doc);
        setLoading(true);
        setError(null);
        try {
            const { getMarkdownContent } = await import('../utils/DocumentationService');
            const content = getMarkdownContent(doc.fileName);
            if (!content) {
                throw new Error('Failed to load documentation file');
            }
            setMarkdownContent(content.default || content);
        } catch (err) {
            console.error('Error loading markdown:', err);
            setError('Could not load the documentation content. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 d-flex align-items-center">
                System Documentation
            </h2>

            <Row>
                <Col md={4} lg={3} className="mb-4">
                    <Card className="shadow border-0">
                        <Card.Header className="bg-body-secondary fw-bold">
                            Available Guides
                        </Card.Header>
                        <ListGroup variant="flush">
                            {availableDocs.map((doc) => (
                                <ListGroup.Item
                                    key={doc.id}
                                    action
                                    active={selectedDoc?.id === doc.id}
                                    onClick={() => handleDocSelect(doc)}
                                    className="d-flex justify-content-between align-items-center py-3"
                                >
                                    <div>
                                        <div className="fw-medium">{doc.title}</div>
                                        <small className={selectedDoc?.id === doc.id ? 'text-white-50' : 'text-muted'}>
                                            {doc.category}
                                        </small>
                                    </div>
                                    <ChevronRight size={14} />
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Card>
                    
                    <Alert variant="info" className="mt-4 shadow-sm border-0">
                        <div className="d-flex">
                            <InfoCircle className="me-2 mt-1 flex-shrink-0" />
                            <small>
                                You see these guides based on your role as <strong className='capitalize'>{user.role.replace('_', ' ')}</strong>.
                            </small>
                        </div>
                    </Alert>
                </Col>

                <Col md={8} lg={9}>
                    <Card className="shadow-sm border-0 min-vh-75">
                        <Card.Body className="p-4 p-lg-3">
                            {loading ? (
                                <div className="d-flex flex-column justify-content-center align-items-center py-5">
                                    <Spinner animation="border" variant="primary" className="mb-3" />
                                    <div className="text-muted">Loading documentation...</div>
                                </div>
                            ) : error ? (
                                <Alert variant="danger">{error}</Alert>
                            ) : (
                                <div className="markdown-content">
                                    <ReactMarkdown>{markdownContent}</ReactMarkdown>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .markdown-content {
                    max-height: 70vh;
                    overflow-y: auto;
                    padding-right: 1rem;
                }
                .markdown-content h1 {
                    border-bottom: 2px solid var(--bs-border-color);
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                    font-weight: 700;
                }
                .markdown-content h2 {
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    font-weight: 600;
                }
                .markdown-content p {
                    line-height: 1.7;
                    margin-bottom: 1rem;
                }
                .markdown-content ul, .markdown-content ol {
                    margin-bottom: 1rem;
                }
                .markdown-content li {
                    margin-bottom: 0.5rem;
                }
                .min-vh-75 {
                    min-height: 75vh;
                }
            `}</style>
        </Container>
    );
};

export default DocumentationsPage;
