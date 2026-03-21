import { Lead } from '../components/trobs/TrobLeadsTable';

export const MOCK_LEADS: Lead[] = [
    {
        id: '1',
        name: 'Lindsey Curtis',
        title: 'Web Designer',
        company: 'Agency Website',
        location: 'San Francisco, CA',
        profileImage: '/images/user/user-17.jpg',
        aiScore: 96,
        status: 'Connected',
        matchQuality: 'Hot',
        profileUrl: 'https://linkedin.com/in/lindseycurtis',
        foundAt: new Date().toISOString()
    },
    {
        id: '2',
        name: 'Kaiya George',
        title: 'Project Manager',
        company: 'Technology',
        location: 'New York, NY',
        profileImage: '/images/user/user-18.jpg',
        aiScore: 88,
        status: 'Contacted',
        matchQuality: 'Warm',
        profileUrl: 'https://linkedin.com/in/kaiyageorge',
        foundAt: new Date().toISOString()
    },
    {
        id: '3',
        name: 'Zain Geidt',
        title: 'Content Writing',
        company: 'Blog Writing',
        location: 'Austin, TX',
        profileImage: '/images/user/user-19.jpg',
        aiScore: 72,
        status: 'Pending',
        matchQuality: 'Warm',
        profileUrl: 'https://linkedin.com/in/zaingeidt',
        foundAt: new Date().toISOString()
    },
    {
        id: '4',
        name: 'Abram Schleifer',
        title: 'Digital Marketer',
        company: 'Social Media',
        location: 'London, UK',
        profileImage: '/images/user/user-20.jpg',
        aiScore: 54,
        status: 'Pending',
        matchQuality: 'Cold',
        profileUrl: 'https://linkedin.com/in/abramschleifer',
        foundAt: new Date().toISOString()
    }
];
