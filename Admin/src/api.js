import axios from 'axios';

// Fetch all projects
export const fetchProjects = async () => {
  try {
    const response = await axios.get('/api/projects'); // Proxy handles localhost:5000
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

// Create a new project
export const createProject = async (projectData) => {
  try {
    const response = await axios.post('/api/projects', projectData);
    return response.data;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};
