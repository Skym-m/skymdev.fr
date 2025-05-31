export default {
    name: 'project',
    type: 'document',
    title: 'Project',
    fields: [
        { name: 'title', type: 'string', title: 'Titre' },
        { name: 'url', type: 'url', title: 'URL' },
        { name: 'image', type: 'image', title: 'Image' },
        { name: 'date', type: 'date', title: 'Date de création' },
        {
            name: 'description',
            type: 'array',
            of: [{ type: 'block' }],
            title: 'Description',
        },
        {
            name: 'file',
            type: 'file',
            title: 'Fichier associé',
        },
    ],
}
