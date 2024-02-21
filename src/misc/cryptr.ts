import { SITE_SECRET } from '$env/static/private';
import Cryptr from 'cryptr';
export default new Cryptr(SITE_SECRET + '');
