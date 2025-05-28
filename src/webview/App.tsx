import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Container,
    Grid,
    Heading,
    Text,
    VStack,
    useToast,
    IconButton,
    HStack,
    Input,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Card,
    CardBody,
    Stack,
    StackDivider,
    Divider,
    Tooltip,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
} from '@chakra-ui/react';
import { AddIcon, CloseIcon, DeleteIcon } from '@chakra-ui/icons';

interface Project {
    name: string;
    path: string;
}

interface Category {
    id: string;
    name: string;
    projects: Project[];
    subcategories?: Category[];
    parentId?: string;
}

declare global {
    interface Window {
        acquireVsCodeApi: () => {
            postMessage: (message: any) => void;
            getState: () => any;
            setState: (state: any) => void;
        };
    }
}

// Store VS Code API at module level to prevent multiple acquisitions
const vscode = window.acquireVsCodeApi();

// Add this helper function
const formatPath = (path: string): string => {
    const parts = path.split('/');
    if (parts.length <= 3) {
        return path;
    }
    return '.../' + parts.slice(-3).join('/');
};

const App: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const cancelRef = React.useRef<HTMLButtonElement>(null);
    const toast = useToast();

    useEffect(() => {
        // Request initial categories
        vscode.postMessage({ type: 'getCategories' });

        // Listen for messages from the extension
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'categories':
                    setCategories(message.categories);
                    break;
                case 'categoryCreated':
                    setCategories(prev => [...prev, message.category]);
                    onClose();
                    setNewCategoryName('');
                    toast({
                        title: 'Category created.',
                        status: 'success',
                        duration: 2000,
                        isClosable: true,
                    });
                    break;
            }
        };

        window.addEventListener('message', messageHandler);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, []);

    const handleCreateCategory = () => {
        if (newCategoryName.trim()) {
            if (selectedParentId) {
                vscode.postMessage({ 
                    type: 'createSubcategory', 
                    parentId: selectedParentId,
                    name: newCategoryName.trim() 
                });
            } else {
                vscode.postMessage({ 
                    type: 'createCategory', 
                    name: newCategoryName.trim() 
                });
            }
            onClose();
            setNewCategoryName('');
            setSelectedParentId(null);
        }
    };

    const handleCreateSubcategory = (parentId: string) => {
        // Find the parent category
        const parentCategory = categories.find(cat => cat.id === parentId);
        if (parentCategory?.parentId) {
            toast({
                title: 'Cannot create subcategory',
                description: 'Subcategories cannot have their own subcategories',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        setSelectedParentId(parentId);
        onOpen();
    };

    const handleAddProject = (categoryId: string) => {
        vscode.postMessage({ type: 'addProject', categoryId });
    };

    const handleRemoveProject = (categoryId: string, projectPath: string, event: React.MouseEvent) => {
        event.stopPropagation();
        vscode.postMessage({ type: 'removeProjectFromCategory', categoryId, projectPath });
    };

    const handleRemoveCategory = (categoryId: string) => {
        setCategoryToDelete(categoryId);
    };

    const confirmRemoveCategory = () => {
        if (categoryToDelete) {
            vscode.postMessage({ type: 'removeCategory', categoryId: categoryToDelete });
            setCategoryToDelete(null);
        }
    };

    const handleProjectClick = (path: string) => {
        vscode.postMessage({ type: 'openProject', path });
    };

    const renderCategoryContent = (category: Category) => (
        <VStack align="stretch" spacing={4}>
            <HStack justifyContent="end">
                {!category.parentId && (
                    <>
                    <Tooltip label="Add a new project to this category" placement="top">
                        <Button
                            leftIcon={<AddIcon />}
                            variant="outline"
                            onClick={() => handleAddProject(category.id)}
                            borderColor="var(--vscode-button-background)"
                            color="var(--vscode-button-background)"
                            _hover={{
                                bg: "var(--vscode-button-hoverBackground)",
                                color: "var(--vscode-button-foreground)"
                            }}
                        >
                            Add Project
                        </Button>
                    </Tooltip>
                    <Tooltip label="Create a new subcategory" placement="top">
                        <Button
                            leftIcon={<AddIcon />}
                            variant="outline"
                            onClick={() => handleCreateSubcategory(category.id)}
                            borderColor="var(--vscode-button-background)"
                            color="var(--vscode-button-background)"
                            _hover={{
                                bg: "var(--vscode-button-hoverBackground)",
                                color: "var(--vscode-button-foreground)"
                            }}
                        >
                            Add Subcategory
                        </Button>
                    </Tooltip>
                    </>
                )}
            </HStack>

            {category.subcategories && category.subcategories.length > 0 && (
                <VStack align="stretch" spacing={6}>
                    {category.subcategories.map((subcategory) => (
                        <>
                            <Box key={subcategory.id}>
                                <HStack justifyContent="space-between" mb={4}>
                                    <Heading size="md" color="var(--vscode-editor-foreground)">
                                        {subcategory.name}
                                    </Heading>
                                    <HStack spacing={2}>
                                        <Tooltip label="Add a new project to this subcategory" placement="top">
                                            <Button
                                                leftIcon={<AddIcon />}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAddProject(subcategory.id)}
                                                borderColor="var(--vscode-button-background)"
                                                color="var(--vscode-button-background)"
                                                _hover={{
                                                    bg: "var(--vscode-button-hoverBackground)",
                                                    color: "var(--vscode-button-foreground)"
                                                }}
                                            >
                                                Add Project
                                            </Button>
                                        </Tooltip>
                                        <Tooltip label="Remove subcategory" placement="top">
                                            <IconButton
                                                aria-label="Remove subcategory"
                                                icon={<DeleteIcon />}
                                                size="sm"
                                                colorScheme="red"
                                                onClick={() => handleRemoveCategory(subcategory.id)}
                                            />
                                        </Tooltip>
                                    </HStack>
                                </HStack>
                                {renderCategoryContent(subcategory)}
                            </Box>
                            <Divider borderColor="var(--vscode-widget-border)" />
                        </>
                    ))}
                </VStack>
            )}

            {category.projects.length > 0 && (
                <Box>
                    <Grid templateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={6}>
                        {category.projects.map((project, index) => (
                            <Card
                                key={index}
                                cursor="pointer"
                                _hover={{ 
                                    transform: 'translateY(-2px)', 
                                    boxShadow: 'lg',
                                    borderColor: 'var(--vscode-button-background)'
                                }}
                                transition="all 0.2s"
                                onClick={() => handleProjectClick(project.path)}
                                bg="var(--vscode-editorWidget-background)"
                                borderColor="var(--vscode-widget-border)"
                            >
                                <CardBody>
                                    <Stack divider={<StackDivider borderColor="var(--vscode-widget-border)" />} spacing="4">
                                        <HStack alignItems="center" justifyContent="space-between" spacing={2}>
                                            <Heading size="md" color="var(--vscode-editor-foreground)" isTruncated>
                                                {project.name}
                                            </Heading>
                                            <Tooltip label="Remove project" placement="top">
                                                <IconButton
                                                    aria-label="Remove project"
                                                    icon={<CloseIcon />}
                                                    size="sm"
                                                    colorScheme="red"
                                                    flexShrink={0}
                                                    onClick={(e) => handleRemoveProject(category.id, project.path, e)}
                                                />
                                            </Tooltip>
                                        </HStack>
                                        <Text pt="2" isTruncated={true} fontSize="xs" color="var(--vscode-descriptionForeground)">
                                            {formatPath(project.path)}
                                        </Text>
                                    </Stack>
                                </CardBody>
                            </Card>
                        ))}
                    </Grid>
                </Box>
            )}
        </VStack>
    );

    return (
        <Container maxW="container.lg" py={8}>
            <VStack spacing={8} align="stretch">
                <Box textAlign="center">
                    <Heading as="h1" size="xl" mb={2} color="var(--vscode-editor-foreground)">Project Manager</Heading>
                    <Text fontSize="lg" color="var(--vscode-descriptionForeground)">
                        Organize your projects with categories and subcategories
                    </Text>
                </Box>

                <Box>
                    <HStack mb={4} spacing={4}>
                        <Tooltip label="Create a new main category" placement="top">
                            <Button 
                                leftIcon={<AddIcon />} 
                                colorScheme="teal" 
                                onClick={() => {
                                    setSelectedParentId(null);
                                    onOpen();
                                }}
                                bg="var(--vscode-button-background)"
                                color="var(--vscode-button-foreground)"
                                _hover={{
                                    bg: "var(--vscode-button-hoverBackground)"
                                }}
                            >
                                New Category
                            </Button>
                        </Tooltip>
                    </HStack>

                    <Tabs variant="enclosed" colorScheme="teal">
                        <TabList borderColor="var(--vscode-widget-border)">
                            {categories.map((category) => (
                                <Tab 
                                    key={category.id}
                                    _selected={{
                                        color: "var(--vscode-button-background)",
                                        borderColor: "var(--vscode-button-background)"
                                    }}
                                >
                                    {category.name}
                                    <Tooltip label="Remove category" placement="top">
                                        <IconButton
                                            aria-label="Remove category"
                                            icon={<DeleteIcon />}
                                            size="xs"
                                            ml={2}
                                            colorScheme="red"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveCategory(category.id);
                                            }}
                                        />
                                    </Tooltip>
                                </Tab>
                            ))}
                        </TabList>

                        <TabPanels>
                            {categories.map((category) => (
                                <TabPanel key={category.id}>
                                    {renderCategoryContent(category)}
                                </TabPanel>
                            ))}
                        </TabPanels>
                    </Tabs>
                </Box>
            </VStack>

            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent bg="var(--vscode-editor-background)">
                    <ModalHeader color="var(--vscode-editor-foreground)">
                        {selectedParentId ? 'Create New Subcategory' : 'Create New Category'}
                    </ModalHeader>
                    <ModalCloseButton color="var(--vscode-editor-foreground)" />
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                            <Input
                                placeholder={selectedParentId ? "Subcategory name" : "Category name"}
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                bg="var(--vscode-input-background)"
                                color="var(--vscode-input-foreground)"
                                borderColor="var(--vscode-input-border)"
                                _hover={{
                                    borderColor: "var(--vscode-input-border)"
                                }}
                                _focus={{
                                    borderColor: "var(--vscode-focusBorder)",
                                    boxShadow: "0 0 0 1px var(--vscode-focusBorder)"
                                }}
                            />
                            <Button 
                                colorScheme="teal" 
                                onClick={handleCreateCategory}
                                bg="var(--vscode-button-background)"
                                color="var(--vscode-button-foreground)"
                                _hover={{
                                    bg: "var(--vscode-button-hoverBackground)"
                                }}
                            >
                                Create
                            </Button>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            <AlertDialog
                isOpen={categoryToDelete !== null}
                leastDestructiveRef={cancelRef}
                onClose={() => setCategoryToDelete(null)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent bg="var(--vscode-editor-background)">
                        <AlertDialogHeader color="var(--vscode-editor-foreground)">
                            Delete Category
                        </AlertDialogHeader>

                        <AlertDialogBody color="var(--vscode-editor-foreground)">
                            Are you sure you want to delete this category? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button
                                ref={cancelRef}
                                onClick={() => setCategoryToDelete(null)}
                                bg="var(--vscode-button-background)"
                                color="var(--vscode-button-foreground)"
                                _hover={{
                                    bg: "var(--vscode-button-hoverBackground)"
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={confirmRemoveCategory}
                                ml={3}
                            >
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Container>
    );
};

export default App; 