import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {Index} from '@/routes/index';
afterEach(cleanup);
it('présente Jardin intérieur et permet de démarrer le vrai test',()=>{
 render(<Index/>);
 expect(screen.getByRole('heading',{name:/Ce qui grandit commence à l’intérieur/})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Commencer'}));
 expect(screen.queryByRole('heading',{name:/Ce qui grandit commence à l’intérieur/})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:/^1 sur 5/})).toBeVisible();
});
